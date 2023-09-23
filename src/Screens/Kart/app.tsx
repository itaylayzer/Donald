import { useEffect, useState } from "react";
import { Socket } from "./assets/websockets";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "./utils/cannonDebugRenderer";
import { lerp } from "three/src/math/MathUtils.js";
import { Player } from "./assets/player";
import { GLTFLoader, GLTF } from "three/addons/loaders/GLTFLoader.js";
import { CustomLight, IBoxList } from "./assets/types";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { ItemCube } from "./assets/itemCube";
function App({ socket }: { socket: Socket | null }) {
    const [pvalue, SetProgress] = useState<number>(0);
    const [consoles, SetConsoles] = useState<Array<string>>([]);
    function _console(...what: (string | any)[]) {
        let newa: string = "";
        for (const x of what) {
            if (typeof x === "string") {
                newa += x;
            } else {
                newa += JSON.stringify(x);
            }
            newa += "     ";
        }
        console.log(...what);
        SetConsoles((old) => [...old, newa]);
    }

    useEffect(() => {
        function loadMeshes(items: { [key: string]: string }): Promise<{
            gltf: { [key: string]: GLTF };
            fbx: { [key: string]: THREE.Group };
        }> {
            return new Promise((resolve, reject) => {
                const loadingManager = new THREE.LoadingManager();
                const gltfLoader = new GLTFLoader(loadingManager);
                const fbxLodaer = new FBXLoader(loadingManager);
                const l: {
                    gltf: { [key: string]: GLTF };
                    fbx: { [key: string]: THREE.Group };
                } = {
                    gltf: {},
                    fbx: {},
                };
                const s = Object.keys(items).length;
                let i = 0;
                let minerI = 0;
                for (const x of Object.entries(items)) {
                    if (x[1].endsWith(".fbx")) {
                        fbxLodaer.load(
                            x[1],
                            (mesh1) => {
                                l.fbx[x[0]] = mesh1;

                                i += 1 / s;
                                minerI = 0;
                                SetProgress(i);
                            },
                            (progres) => {
                                minerI = progres.loaded / progres.total;
                                SetProgress(i + minerI);
                            }, // onProgress callback (useful for progress tracking)
                            (error) => {
                                reject(error); // Reject the promise if there's an error
                            }
                        );
                    } else if (x[1].endsWith(".gltf")) {
                        gltfLoader.load(
                            x[1],
                            (mesh1) => {
                                l.gltf[x[0]] = mesh1;

                                i += 1 / s;
                                minerI = 0;
                                SetProgress(i);
                            },
                            (progres) => {
                                minerI = progres.loaded / progres.total;
                                SetProgress(i + minerI);
                            }, // onProgress callback (useful for progress tracking)
                            (error) => {
                                reject(error); // Reject the promise if there's an error
                            }
                        );
                    }
                }

                loadingManager.onLoad = () => {
                    _console(`Loaded FBX`, Array.from(Object.keys(l.fbx)));
                    _console(`Loaded GLTF`, Array.from(Object.keys(l.gltf)));

                    resolve(l);
                };
            });
        }

        async function Game(meshes: { gltf: { [key: string]: GLTF }; fbx: { [key: string]: THREE.Group } }) {
            //#region Initializing

            const container = document.querySelector("div.gameContainer") as HTMLDivElement;
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 0, 0); // Adjust the position as needed
            camera.lookAt(0, 0, 0); // Make the camera look at the center (0, 0, 0)
            const spherical = new THREE.Spherical(6, Math.PI, 0); // Initial spherical coordinates (radius, polar angle, azimuthal angle)

            const world = new CANNON.World({
                gravity: new CANNON.Vec3(0, -50, 0),
            });
            world.defaultContactMaterial.contactEquationStiffness = 1e9;
            world.defaultContactMaterial.contactEquationRelaxation = 3;

            function Rot2Qua(x: number, y: number, z: number) {
                const quaternion = new CANNON.Quaternion();
                quaternion.setFromEuler(x, y, z);
                return quaternion;
            }
            function addBodies(...a: CANNON.Body[]) {
                for (const x of a) {
                    world.addBody(x);
                }
            }
            let meshesArr: THREE.Object3D[] = [];
            function addMesh(...object: THREE.Object3D[]) {
                meshesArr.push(...object);

                scene.add(...object);
            }

            const textureloader = new THREE.TextureLoader();

            var texture = await textureloader.loadAsync("textures/bricks500x500x2.png");
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.offset.set(0, 0);
            texture.repeat.set(200, 200);

            var material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                specular: 0x111111,
                shininess: 10,
                map: texture,
                clipShadows: true,
            });

            const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(200, 0.4, 200), material);
            const groundBody = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Box(new CANNON.Vec3(100, 0.2, 100)),
                position: new CANNON.Vec3(0, 0, 0),

                collisionFilterGroup: 1,
                collisionFilterMask: 1 | 2 | 8,
            });

            scene.add(groundMesh);
            world.addBody(groundBody);

            //#endregion
            //#region Meshes

            const loadedMeshes: {
                [key: string]: {
                    body: CANNON.Body | CANNON.Body[];
                    mesh: THREE.Mesh | THREE.Mesh[];
                };
            } = {};
            for (const x of Object.entries(meshes.gltf)) {
                const _mesh = x[1].scene.children[0]; // Assuming there's only one mesh in the GLTF

                if (_mesh.children.length > 0) {
                    _console("_mesh.children.length > 0", x[0], _mesh.children.length);

                    const xbodies: CANNON.Body[] = [];
                    const xmeshes: THREE.Mesh[] = [];
                    for (let index = 0; index < _mesh.children.length; index++) {
                        // Assuming you want to use the first child mesh for collision
                        const childMesh = _mesh.children[index];

                        // Scene Handeling
                        // @ts-ignore
                        const material = childMesh.material;
                        if (material.map) {
                            material.needsUpdate = true;
                        }

                        // @ts-ignore
                        const geometry = childMesh.geometry;
                        const xmesh: THREE.Mesh = new THREE.Mesh(geometry, material);
                        // scene.add(childMesh);
                        // Get the geometry from the Three.js child mesh

                        // Extract vertex indices for faces
                        const indices = geometry.index.array;

                        // Create a Cannon.js Trimesh from the geometry's vertices and indices
                        const vertices = geometry.attributes.position.array;
                        const trimesh = new CANNON.Trimesh(vertices, indices);

                        // Create a Cannon.js body and add the Trimesh as a shape
                        const xbody = new CANNON.Body({ mass: 0 });
                        xbody.addShape(trimesh);

                        // Connect Three.js child mesh position/rotation to Cannon.js body
                        xmesh.position.set(xbody.position.x, xbody.position.y, xbody.position.z);
                        xmesh.quaternion.set(xbody.quaternion.x, xbody.quaternion.y, xbody.quaternion.z, xbody.quaternion.w);
                        xbodies.push(xbody);
                        xmeshes.push(xmesh);
                    }
                    loadedMeshes[x[0]] = {
                        body: xbodies,
                        mesh: xmeshes,
                    };
                } else {
                    // Scene Handeling
                    // @ts-ignore
                    const material = _mesh.material;
                    if (material.map) {
                        // You can apply the texture to the material
                        // For example, if childMesh's material is a MeshStandardMaterial:
                        // material.map is the diffuse texture, so you can set it like this:
                        // material.map = new THREE.TextureLoader().load('path_to_texture.png');
                        // You may need to adjust the texture path accordingly.

                        // Make sure the material is updated
                        material.needsUpdate = true;
                    }
                    // @ts-ignore
                    const geometry = _mesh.geometry;
                    const xmesh: THREE.Mesh = new THREE.Mesh(geometry, material);
                    // scene.add(childMesh);
                    // scene.add(xmesh);
                    // Get the geometry from the Three.js child mesh

                    // Extract vertex indices for faces
                    const indices = geometry.index.array;

                    // Create a Cannon.js Trimesh from the geometry's vertices and indices
                    const vertices = geometry.attributes.position.array;
                    const trimesh = new CANNON.Trimesh(vertices, indices);

                    // Create a Cannon.js body and add the Trimesh as a shape
                    const xbody = new CANNON.Body({ mass: 0 });
                    xbody.addShape(trimesh);
                    // world.addBody(xbody); // Add to Cannon.js world

                    // Connect Three.js child mesh position/rotation to Cannon.js body
                    xmesh.position.set(xbody.position.x, xbody.position.y, xbody.position.z);
                    xmesh.quaternion.set(xbody.quaternion.x, xbody.quaternion.y, xbody.quaternion.z, xbody.quaternion.w);

                    loadedMeshes[x[0]] = {
                        body: xbody,
                        mesh: xmesh,
                    };
                }
            }
            const definedFbxs = meshes.fbx as {
                player: THREE.Group;
                car: THREE.Group;
                sitting: THREE.Group;
            };
            // @ts-ignore
            globalThis.myFbx = definedFbxs;

            Player.carMesh = {
                car: definedFbxs.car,
                player: definedFbxs.player,
            };

            Player.onNew = (x: Player) => {
                if (x.mesh != null) addMesh(x.mesh);
                world.addBody(x.body);
                x.carBody ? world.addBody(x.carBody) : "";
            };
            const localPlayer = new Player(socket !== null ? socket.id : "", true);
            {
                const sittingPose = localPlayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
                sittingPose.play();
            }

            const keyHandlers = {
                pressing: {
                    // Space: () => {
                    //     localPlayer.body.velocity.y = lerp(localPlayer.body.velocity.y, Math.max(-2, localPlayer.body.velocity.y), 0.15);
                    // },
                },
                up: {},
                down: {
                    // Space: () => {
                    //     localPlayer.body.velocity.y = 20;
                    // },
                },
            };

            const keysDown = new Set<string>();

            document.onkeydown = (event) => {
                // @ts-ignore
                if (!keysDown.has(event.code)) keyHandlers.down[event.code]?.();

                keysDown.add(event.code);
            };
            document.onkeyup = (event) => {
                // @ts-ignore
                if (keysDown.has(event.code)) keyHandlers.up[event.code]?.();
                keysDown.delete(event.code);
            };

            //#endregion

            function createLights(c: CustomLight[]) {
                for (const x of c) {
                    let l;
                    if (x.type === "directional") {
                        l = new THREE.DirectionalLight(x.color, x.intensity);
                    } else if (x.type === "point") {
                        l = new THREE.PointLight(x.color, x.intensity);
                    } else {
                        l = new THREE.AmbientLight(x.color, x.intensity);
                    }

                    if (x.pos) {
                        l.position.copy(x.pos);
                    } else {
                        l.position.set(0, 10, 0);
                    }
                    if (x.rot) {
                        l.rotation.copy(x.rot);
                    }
                    l.castShadow = true;
                    if (l.shadow) {
                        l.shadow.mapSize.width = 1024;
                        l.shadow.mapSize.height = 1024;

                        l.shadow.camera.near = 500;
                        l.shadow.camera.far = 4000;
                    }

                    scene.add(l);
                }
            }
            createLights([
                {
                    color: 0xffffff,
                    intensity: 2,
                    type: "directional",
                    rot: new THREE.Euler(0.1, 0.1, 0),
                },
                {
                    color: 0xffffff,
                    intensity: 1,
                    type: "ambient",
                    rot: new THREE.Euler(0.9, 0.5, 0),
                },
            ]);
            scene.background = new THREE.Color("white");
            // scene.fog = new THREE.Fog("white", 20, 100);
            //#region Sockets Event Listeners
            const clients = new Map<string, Player>();
            const iboxes = new Map<string, ItemCube>();
            ItemCube.onNew = (x) => {
                addMesh(x.mesh);
                world.addBody(x.body);
            };
            socket?.on("i", (args: { p: string[]; c: IBoxList }) => {
                for (const x of args.p) {
                    const xplayer = new Player(x);
                    const sittingPose = xplayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
                    sittingPose.play();

                    clients.set(x, xplayer);
                }

                for (const x of Object.entries(args.c)) {
                    const xl = loadedMeshes["guess"];

                    if (Array.isArray(xl.mesh)) {
                        continue;
                    }
                    const itemCube = new ItemCube(xl.mesh, x[1].pos, x[1].available, (event: { body: CANNON.Body | undefined }) => {
                        if ((event.body ? event.body.id : "") === localPlayer.carBody?.id) {
                            socket.emit("b", x[0]);
                        }
                    });

                    iboxes.set(x[0], itemCube);
                }
                clients.set(socket.id, localPlayer);
            });
            // box available
            socket?.on("ba", (a: { id: string; av: boolean }) => {
                const xbox = iboxes.get(a.id);
                if (xbox === undefined) return;

                if (a.av !== xbox.available) {
                    if (a.av) {
                        xbox.appear(() => {
                            addMesh(xbox.mesh);
                            world.addBody(xbox.body);
                        });
                    } else {
                        xbox.disapear(()=>{
                            world.removeBody(xbox.body);
                        },() => {
                            scene.remove(xbox.mesh);
                        });
                    }
                }

                xbox.available = a.av;
            });
            socket?.on("n-p", (x: string) => {
                const xplayer = new Player(x);
                const sittingPose = xplayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
                sittingPose.play();

                clients.set(x, xplayer);
            });
            socket?.on("m", (args: { pos: [number, number, number]; rot: number; id: string }) => {
                const xplayer = clients.get(args.id);
                if (xplayer === undefined) return;
                xplayer.body.position.set(args.pos[0], args.pos[1], args.pos[2]);
                if (xplayer.mesh != null) xplayer.mesh.position.set(args.pos[0], args.pos[1] - 0.2, args.pos[2]);
                const _quaternion = new CANNON.Quaternion();
                _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), (args.rot * Math.PI) / 180);
                if (xplayer.mesh != null) xplayer.mesh.quaternion.set(_quaternion.x, _quaternion.y, _quaternion.z, _quaternion.w);
                xplayer.body.type === CANNON.BODY_TYPES.STATIC;
                xplayer.body.mass = 1;

                if (xplayer.carBody) {
                    xplayer.carBody.position.set(args.pos[0], args.pos[1] + 0.5, args.pos[2]);
                    xplayer.carBody.quaternion.copy(_quaternion);
                    xplayer.carBody.velocity.scale(0);
                }
            });
            socket?.on("p-dis", (id: string) => {
                const xplayer = clients.get(id);
                if (xplayer === undefined) return;
                clients.delete(id);
                world.removeBody(xplayer.body);
                if (xplayer.mesh != null) scene.remove(xplayer.mesh);
            });
            socket?.on("br", () => {});
            socket?.emit("i");

            //#endregion

            //#region Runtime
            let _lastTime: number = new Date().getTime();
            let deltaTime: number = 16;
            const cannonDebugger = new CannonDebugger(scene, world);

            const keysAxis = {
                horizontal: 0,
                vertical: 0,
            };
            var animating = true;
            let rotation = 180;
            const cameraTarget = new THREE.Vector3(0, 0, 0);
            const raycaster = new THREE.Raycaster();

            function Vector3ToVec3(v: THREE.Vector3) {
                return new CANNON.Vec3(v.x, v.y, v.z);
            }
            const animate = () => {
                if (animating) requestAnimationFrame(animate);

                const keysAxisRaw = {
                    horizontal: keysDown.has("KeyD") && keysDown.has("KeyA") ? 0 : keysDown.has("KeyD") ? 1 : keysDown.has("KeyA") ? -1 : 0,
                    vertical: keysDown.has("KeyW") && keysDown.has("KeyS") ? 0 : keysDown.has("KeyW") ? 1 : keysDown.has("KeyS") ? -1 : 0,
                };
                const x = keysAxisRaw;
                for (const key in Object.keys(keysAxis)) {
                    const k = Object.keys(keysAxis)[key] as "horizontal" | "vertical";

                    keysAxis[k] = lerp(keysAxis[k], x[k], 0.05);
                }

                for (const ib of iboxes) {
                    if (ib[1].spin === false) continue;
                    ib[1].mesh.rotateX(0.015);
                    ib[1].mesh.rotateY(0.02);
                    ib[1].mesh.rotateZ(0.01);
                }

                rotation -= keysAxis.horizontal * 2 * keysAxis.vertical;
                const _quaternion = new CANNON.Quaternion();
                const thetha = (rotation * Math.PI) / 180 + keysAxis.horizontal * 0.2 * keysAxis.vertical;
                spherical.phi = (Math.PI * (0.6 + keysAxis.vertical / 20)) / 2;

                spherical.theta = thetha + Math.PI;
                _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), (rotation * Math.PI) / 180);
                const forwardVector = new CANNON.Vec3(0, 0, 1);
                const carForward = _quaternion.vmult(forwardVector);
                const carVelocity = carForward.scale(keysAxis.vertical * 15);
                localPlayer.body.velocity = new CANNON.Vec3(carVelocity.x, localPlayer.body.velocity.y, carVelocity.z);
                // Update the camera position based on the spherical coordinates
                cameraTarget.x = lerp(cameraTarget.x, localPlayer.body.position.x, 0.15);
                cameraTarget.y = lerp(cameraTarget.y, localPlayer.body.position.y, 0.2);
                cameraTarget.z = lerp(cameraTarget.z, localPlayer.body.position.z, 0.15);

                camera.position.setFromSpherical(spherical).add(cameraTarget);

                camera.lookAt(cameraTarget);
                camera.rotateZ(keysAxis.horizontal / 20);
                [...keysDown].forEach((k) => {
                    // @ts-ignore
                    keyHandlers.pressing[k]?.();
                });

                var _newTime = new Date();
                deltaTime = _newTime.getTime() - _lastTime;
                _lastTime = _newTime.getTime();
                if (localPlayer.mesh != null) {
                    localPlayer.mesh.position.set(localPlayer.body.position.x, localPlayer.body.position.y - 0.2, localPlayer.body.position.z);
                    localPlayer.mesh.quaternion.set(_quaternion.x, _quaternion.y, _quaternion.z, _quaternion.w);
                    localPlayer.mesh.rotateZ((keysAxis.horizontal * 3.14) / 15);
                }
                if (localPlayer.carBody) {
                    localPlayer.carBody.position.set(localPlayer.body.position.x, localPlayer.body.position.y + 0.5, localPlayer.body.position.z);
                    localPlayer.carBody.quaternion.copy(_quaternion);
                    localPlayer.carBody.velocity.scale(0);
                }
                // cube.quaternion.set(localPlayer.body.quaternion.x, localPlayer.body.quaternion.y, localPlayer.body.quaternion.z, localPlayer.body.quaternion.w);
                world.step(1.0 / 60.0, 1.0 / 60.0, 10);

                cannonDebugger.update();
                socket?.emit("m", {
                    pos: [localPlayer.body.position.x, localPlayer.body.position.y, localPlayer.body.position.z],
                    rot: rotation,
                });
                renderer.render(scene, camera);
            };
            //#endregion
            if (localPlayer.mixer != null) {
                localPlayer.mixer.update(1 / 60);
            }
            for (const xplayer of Array.from(clients.values())) {
                xplayer.mixer?.update(1 / 60);
            }

            animate();
            window.addEventListener("resize", onWindowResize, false);
            function onWindowResize() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();

                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        }

        loadMeshes({
            player: "fbx/endy-rigged.fbx",
            car: "fbx/motor.fbx",
            guess: "gltf/box/guess.gltf",
            sitting: "fbx/animations/sitting.fbx",
        })
            .then((meshes) => {
                SetProgress(1);

                function waitForCanvas() {
                    try {
                        Game(meshes);
                    } catch {
                        requestAnimationFrame(waitForCanvas);
                    }
                }
                requestAnimationFrame(waitForCanvas);
            })
            .catch((r: ErrorEvent) => {
                alert(r.message);
                _console(r);
            });

        return () => {
            document.location.reload();
        };
    }, []);

    return (
        <>
            {pvalue === 1 ? (
                <>
                    <div className="gameContainer"></div>

                    <div className="gameUI">
                        {/* <img className="map" src="png/ccmmap.png" alt="" />
                        <h4>
                            <span>3</span>rd
                        </h4>
                        <div className="left-bottom">
                            <div className="item">
                                <p>07</p>
                            </div>
                            <div className="item">
                                <p>1</p>
                                <p>/3</p>
                            </div>
                        </div> */}
                        <div className="consoles">
                            {consoles.map((v) => (
                                <p>{v}</p>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <progress value={pvalue} max={1}></progress>
                </>
            )}
        </>
    );
}

export default App;
