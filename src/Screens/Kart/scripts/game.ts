import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Socket } from "../assets/socket.io";
import { QuatToQuaternion, QuaternionToQuat, RotToQuat, TWWEENS, Vec3ToVector3, Vector3ToVec3 } from "../assets/functions";
import CannonDebugger from "../utils/cannonDebugRenderer";
import { lerp } from "three/src/math/MathUtils.js";
import { Player } from "../classess/player";
import { CustomLight, IBoxList, Item, Settings, loadedAssets } from "../assets/types";
import { filtersDefenitions as filters } from "../assets/inputs";
import { ItemCube } from "../classess/itemCube";
import StopSign from "../classess/stopSign";
import { car_cm, groundMaterial, ground_cm, player_ground_cm } from "../assets/materials";
import curveJSON from "../assets/curveJSON.json";
import { MapCurve } from "../classess/mapCurve";
import { PlayerMovement } from "../classess/movement";

export default function Game({
    socket,
    log,
    assets,
    setFPS,
    setVEL,
    setITEM,
    setEFFECT,
    setROUNDS,
    setPOS,
    DISPLAY,
    settings,
}: {
    socket: Socket | null;
    assets: loadedAssets;
    log: (...x: any[]) => void;
    setFPS: React.Dispatch<number>;
    setVEL: React.Dispatch<number>;
    setITEM: React.Dispatch<Item>;
    setEFFECT: React.Dispatch<number>;
    setROUNDS: React.Dispatch<number>;
    setPOS: React.Dispatch<number>;
    DISPLAY: {
        SET: (...x: any[]) => void;
        CLEAR: () => void;
    };
    settings: Settings;
}) {
    let deltaTime = 0,
        fps = 0;
    console.log(`recieved Settings `, settings);

    const mapCurve = new MapCurve(curveJSON.points, 80);

    const container = document.querySelector("div.gameContainer") as HTMLDivElement;
    container.style.scale = `${1 / settings.videoScale}`;
    container.style.width = `${container.clientWidth * settings.videoScale}px`;
    container.style.height = `${container.clientHeight * settings.videoScale}px`;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    const spherical = new THREE.Spherical(6, Math.PI, 0);
    scene.background = new THREE.Color("white");
    scene.fog = new THREE.Fog("white", 20, 100);

    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -50, 0),
    });

    function createCannonFromGeometry(
        geometry: THREE.BufferGeometry,
        options: {
            quaternion?: THREE.Quaternion;
            position?: THREE.Vector3;
            rotation?: THREE.Euler;
            mass?: number;
            collisionFilterGroup?: number;
            collisionFilterMask?: number;
            material?: CANNON.Material;
        }
    ) {
        const vertices = Array.from(new Float32Array(geometry.attributes.position.array).values());
        const faces = (geometry.index ? new Uint16Array(geometry.index.array) : []) as number[];
        console.log(faces);
        const shape = new CANNON.Trimesh(vertices, faces);

        const body = new CANNON.Body({
            mass: options.mass ?? 0,
            collisionFilterGroup: options.collisionFilterGroup ?? undefined,
            collisionFilterMask: options.collisionFilterMask ?? undefined,
            material: options.material ?? undefined,
            shape: shape,
            position: options.position ? Vector3ToVec3(options.position) : undefined,
            quaternion: options.quaternion ? QuaternionToQuat(options.quaternion) : options.rotation ? RotToQuat(options.rotation) : undefined,
        });

        return body;
    }

    Player.onNew = (x: Player) => {
        if (x.mesh != null) scene.add(x.mesh);
        world.addBody(x.body);
        x.carBody ? world.addBody(x.carBody) : "";
        x.body.position.set(0, 10, 0);
    };
    ItemCube.onNew = (x) => {
        const levelOfDetails = new THREE.LOD();
        levelOfDetails.addLevel(x.mesh, 5);

        scene.add(levelOfDetails);
        world.addBody(x.body);
    };

    const definedFbxs = assets.fbx as {
        player: THREE.Group;
        car: THREE.Group;
        sitting: THREE.Group;
    };

    const loadedMeshes: {
        [key: string]: {
            body: CANNON.Body | CANNON.Body[];
            mesh: THREE.Mesh | THREE.Mesh[];
        };
    } = {};

    const clients = new Map<string, Player>();
    const iboxes = new Map<string, ItemCube>();

    let worldMeshes: Array<THREE.Mesh> | undefined = undefined;
    const keyHandlers = {
        pressing: {},
        up: {
            KeyJ: _UseItem,
            Enter: _UseItem,
            ShiftLeft: _UseItem,
            KeyV: () => {
                if (worldMeshes) {
                    scene.remove(...worldMeshes);
                    worldMeshes = undefined;
                }
            },
        },
        down: {
            KeyV: () => {
                worldMeshes = mapCurve.meshes();
                scene.add(...worldMeshes);
            },
            KeyP: () => {
                const p = mapCurve.get(70);
                localPlayer.position = 70;
                localPlayer.body.position.copy(Vector3ToVec3(p.clone().add(new THREE.Vector3(0, 3, 0))));
            },
            KeyR: () => {
                localPlayer.spinAtPlace();
            },
            KeyO: () => {
                localPlayer.body.applyImpulse(new CANNON.Vec3(1000, 0, 0));
            },
        },
    };
    const keysDown = new Set<string>();

    function _createGround() {
        var texture = assets.textures["ground"];
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        // texture.repeat.set(200, 200);
        texture.repeat.set(50, 5);

        var material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: 0x111111,
            shininess: 10,
            map: texture,
            clipShadows: true,
        });

        console.log(assets.gltf.xmap);
        const xmap = assets.gltf.xmap.scene;
        scene.add(xmap);
        console.log(xmap);
        console.log(xmap.children);

        if (xmap.children.length > 0) {
            if (xmap.children[0] as THREE.Mesh) {
                const xmapMesh = xmap.children[0] as THREE.Mesh;
                xmapMesh.material = material;
                const xmapBody = createCannonFromGeometry(xmapMesh.geometry, {
                    position: xmap.position,
                    rotation: xmap.rotation,
                    mass: 0,
                    collisionFilterGroup: filters.ground,
                    collisionFilterMask:
                        filters.ground | filters.carBody | filters.localCarBody | filters.stopSign | filters.localPlayerBody | filters.wheel,
                    material: groundMaterial,
                });
                world.addBody(xmapBody);
            }
        }

        {
            const winningMesh = new THREE.Mesh(
                new THREE.BoxGeometry(20, 10, 1),
                new THREE.MeshStandardMaterial({
                    opacity: 0.4,
                    transparent: true,
                    color: "green",
                })
            );
            winningMesh.position.copy(mapCurve.get(mapCurve.winningIndex)).add(new THREE.Vector3(0, 5, 0));

            const winningBody = new CANNON.Body({
                isTrigger: true,
                collisionFilterGroup: filters.itemBox,
                collisionFilterMask: filters.localCarBody,
                shape: new CANNON.Box(new CANNON.Vec3(10, 5, 0.1)),
                position: Vector3ToVec3(winningMesh.position),
                quaternion: QuaternionToQuat(winningMesh.quaternion),
            });

            winningBody.addEventListener("collide", (event: { body: CANNON.Body | undefined }) => {
                if (event.body === undefined) return;

                // FIXME:
                let rotation = localPlayer.rotation % 360;
                if (rotation < 0) rotation += 360;
                if (
                    localPlayer.roundable &&
                    event.body.id === localPlayer.carBody.id &&
                    rotation > 90 &&
                    rotation < 270 &&
                    localPlayer.position === mapCurve.winningIndex
                ) {
                    if (localPlayer.rounds % 1 == 0) {
                        localPlayer.roundable = false;
                        localPlayer.rounds += 0.5;
                        socket?.emit("r", Math.ceil(localPlayer.rounds));
                        winningMesh.material.opacity = 0;
                        winningBody.collisionFilterMask = 0;
                        setTimeout(() => {
                            winningBody.collisionFilterMask = filters.localCarBody;
                            winningMesh.material.opacity = 0.4;
                        }, 3 * 1000);
                    }
                }
            });
            world.addBody(winningBody);
            scene.add(winningMesh);
        }

        // const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(200, 0.4, 200), material);
        // const groundBody = new CANNON.Body({
        //     mass: 0,
        //     shape: new CANNON.Box(new CANNON.Vec3(100, 1.5, 100)),
        //     position: new CANNON.Vec3(0, 0, 0),
        //     material: groundMaterial,
        //     collisionFilterGroup: filters.ground,
        //     collisionFilterMask: filters.ground | filters.carBody | filters.localCarBody | filters.stopSign | filters.localPlayerBody | filters.wheel,
        // });

        // scene.add(groundMesh);
        // world.addBody(groundBody);

        world.addContactMaterial(ground_cm);
        world.addContactMaterial(player_ground_cm);
        world.addContactMaterial(car_cm);
        // world.addContactMaterial(soft_ground_cm);
    }
    function _loadMesh() {
        for (const x of Object.entries(assets.gltf)) {
            const _mesh = x[1].scene.children[0]; // Assuming there's only one mesh in the GLTF

            if (_mesh.children.length > 0) {
                // log("_mesh.children.length > 0", x[0], _mesh.children.length);

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
        // @ts-ignore
        globalThis.myFbx = definedFbxs;
        Player.carMesh = {
            car: definedFbxs.car,
            player: definedFbxs.player,
        };
    }
    let blur = false;
    function _windowEvents() {
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

        window.onblur = () => {
            blur = true;
            for (const x of keysDown) {
                keysDown.delete(x);
            }
        };
        window.onfocus = () => {
            blur = false;
        };
        window.onresize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            container.style.scale = `${1 / settings.videoScale}`;
            container.style.width = `${window.innerWidth * settings.videoScale}px`;
            container.style.height = `${window.innerHeight * settings.videoScale}px`;

            renderer.setSize(window.innerWidth, window.innerHeight);
        };
    }
    function _createLights() {
        (function (c: CustomLight[]) {
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
        })([
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
    }

    _createGround();
    _loadMesh();
    _windowEvents();
    _createLights();

    const localPlayer = new Player(socket !== null ? socket.id : "", true, {
        effect: (s) => {
            socket?.emit("ae", { p: s, e: 3 });
        },
    });
    {
        localPlayer.position = mapCurve.findClosestPointIndex(localPlayer.mesh.position);
        const sittingPose = localPlayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
        sittingPose.play();
    }
    const playerMovement = new PlayerMovement(localPlayer, camera, log);

    function _socketInitiates() {
        if (socket === null) return;

        socket.on("i", (args: { p: string[]; c: IBoxList }) => {
            for (const x of args.p) {
                const xplayer = new Player(x);
                {
                    const sittingPose = xplayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
                    sittingPose.play();
                }

                clients.set(x, xplayer);
            }

            for (const x of Object.entries(args.c)) {
                const xl = loadedMeshes["guess"];

                if (Array.isArray(xl.mesh)) {
                    continue;
                }
                const itemCube = new ItemCube(xl.mesh, x[1].pos, x[1].available, (self) => (event: { body: CANNON.Body | undefined }) => {
                    if ((event.body ? event.body.id : "") === localPlayer.carBody?.id && self.available) {
                        self.available = false;
                        socket.emit("b", x[0]);
                    }
                });

                iboxes.set(x[0], itemCube);
            }
        });

        socket.on("ba", (a: { id: string; av: boolean }) => {
            const xbox = iboxes.get(a.id);
            if (xbox === undefined) return;
            if (a.av) {
                xbox.appear(() => {
                    xbox.available = true;
                    scene.add(xbox.mesh);
                    world.addBody(xbox.body);
                });
            } else {
                xbox.disapear(
                    () => {
                        xbox.available = false;
                        world.removeBody(xbox.body);
                    },
                    () => {
                        scene.remove(xbox.mesh);
                    }
                );
            }
        });
        socket.on("n-p", (x: string) => {
            const xplayer = new Player(x);
            const sittingPose = xplayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
            sittingPose.play();

            clients.set(x, xplayer);
        });
        socket.on("m", (args: { pos: [number, number, number]; rot: number; side: number; vel: [number, number, number]; id: string }) => {
            const xplayer = clients.get(args.id);
            if (xplayer === undefined) return;
            xplayer.body.position.set(args.pos[0], args.pos[1], args.pos[2]);
            xplayer.mesh.position.set(args.pos[0], args.pos[1] - 0.2, args.pos[2]);
            const _quaternion = new CANNON.Quaternion();
            _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), args.rot * THREE.MathUtils.DEG2RAD);
            xplayer.mesh.quaternion.copy(QuatToQuaternion(_quaternion));
            xplayer.body.mass = 10;
            xplayer.mesh.rotateZ((args.side * 3.14) / 15);
            xplayer.rotation = args.rot;
            xplayer.body.velocity.set(args.vel[0], 0, args.vel[2]);

            if (xplayer.carBody) {
                xplayer.carBody.position.set(args.pos[0], args.pos[1], args.pos[2]);
                xplayer.carBody.quaternion.copy(_quaternion);
                xplayer.carBody.angularDamping = 1;
                xplayer.carBody.initAngularVelocity.scale(0, xplayer.carBody.initAngularVelocity);
                xplayer.carBody.angularVelocity.scale(0, xplayer.carBody.angularVelocity);
            }
        });
        socket.on("p-dis", (id: string) => {
            const xplayer = clients.get(id);
            if (xplayer === undefined) return;
            clients.delete(id);
            world.removeBody(xplayer.body);
            if (xplayer.mesh != null) scene.remove(xplayer.mesh);
        });
        socket.on("br", (r: number) => {
            if (localPlayer.item !== false || localPlayer.effect !== 0) return;
            localPlayer.item = r;
            setITEM(r);
        });

        socket.on("ui", (a: { p: string; v: number }) => {
            const xplayer = a.p === socket.id ? localPlayer : clients.get(a.p);
            if (xplayer === undefined) return;
            if (a.v === 4) {
                TWWEENS.deltaTime(deltaTime).playerScale(xplayer, 3);
                xplayer.effect = 2;
                setEFFECT(localPlayer.effect);
                return;
            }
            if (a.v === 2) {
                new StopSign(
                    xplayer,
                    localPlayer,
                    assets.fbx["stop"].clone(),
                    (m, b) => {
                        world.addBody(b);
                        scene.add(m);
                    },
                    (m, b) => {
                        world.removeBody(b);
                        scene.remove(m);
                    },
                    deltaTime
                );
                return;
            }
            if (a.v === 5 && socket.id !== a.p) {
                const queryElement = document.querySelector("div.gameUI#kart video#troll");
                if (queryElement == null) return;
                const videoElement = queryElement as HTMLVideoElement;
                videoElement.play();
                let sin = 0;
                let interval = setInterval(() => {
                    sin += deltaTime * 5;
                    videoElement.style.opacity = `${0.25 + (1 + Math.sin(sin)) / 4}`;
                }, deltaTime * 1000);
                setTimeout(() => {
                    clearInterval(interval);
                    videoElement.pause();
                    videoElement.style.opacity = "0";
                }, 5000);
                return;
            }
            if (a.v === 1) {
                if (socket.id === a.p) {
                    const _filters = localPlayer.body.collisionFilterMask;
                    localPlayer.body.collisionFilterMask = 0;
                    localPlayer.moveable = false;
                    mapCurve.movePlayerWithRocket(
                        5,
                        localPlayer.mesh.position,
                        35,
                        (v, r) => {
                            localPlayer.body.position.copy(Vector3ToVec3(v.clone().add(new THREE.Vector3(0, 2, 0))));
                            localPlayer.body.velocity.y = 0;
                            localPlayer.rotation = lerp(localPlayer.rotation, -r + 90, deltaTime * 5);
                        },
                        () => {
                            localPlayer.moveable = true;
                            localPlayer.body.collisionFilterMask = _filters;
                        }
                    );
                }
                xplayer.effect = 4;
                setEFFECT(localPlayer.effect);
                return;
            }
            if (a.v === 0) {
                xplayer.effect = 1;
                setEFFECT(localPlayer.effect);
            }
            if (a.v === 3) {
                const wheel = assets.fbx["wheel"].clone();
                wheel.scale.multiplyScalar(0.008);
                scene.add(wheel);
                const restPlayers = [localPlayer, ...Array.from(clients.values())].filter((v) => v.id !== a.p);
                mapCurve.moveElectricWheel(
                    35,
                    restPlayers,
                    xplayer.mesh.position,
                    (p, timeElapsed) => {
                        const wheelBody = new CANNON.Body({
                            mass: 1,
                            collisionFilterGroup: filters.wheel,
                            collisionFilterMask: filters.ground | filters.carBody | filters.localCarBody,
                            position: Vector3ToVec3(wheel.position).vadd(new CANNON.Vec3(0, 1, 0)),
                            shape: new CANNON.Box(new CANNON.Vec3(0.1, 1, 1)),
                        });

                        let destroyed = false;

                        wheelBody.addEventListener("collide", (event: { body: CANNON.Body | undefined }) => {
                            if (event.body === undefined) return;
                            const obj = Object.fromEntries(restPlayers.map((v) => [v.carBody.id.toString(), v]));
                            const x = event.body.id.toString();
                            if (Object.keys(obj).includes(x)) {
                                const xplayer = obj[x];
                                xplayer.spinAtPlace();
                                destroyed = true;
                            }
                        });
                        world.addBody(wheelBody);
                        const dir = p.mesh.position.clone().sub(wheel.position).normalize().setY(0);
                        const rot = Math.atan2(dir.z, dir.x) * THREE.MathUtils.RAD2DEG;
                        log(dir);
                        function wheelMovement() {
                            dir.setY(0);
                            wheel.quaternion.slerp(
                                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-rot + 90) * THREE.MathUtils.DEG2RAD),
                                deltaTime * 5
                            );

                            wheel.position.add(dir.clone().multiplyScalar(deltaTime * 35));
                            wheelBody.position.copy(Vector3ToVec3(wheel.position).vadd(new CANNON.Vec3(0, 1, 0)));
                            timeElapsed += deltaTime * 1000;
                            if (wheelBody.position.y > -20 && !destroyed && timeElapsed < 5 * 1000) {
                                requestAnimationFrame(wheelMovement);
                            } else {
                                world.removeBody(wheelBody);
                                scene.remove(wheel);
                            }
                        }

                        wheelMovement();
                    },
                    () => {
                        scene.remove(wheel);
                    },
                    (v, r) => {
                        wheel.position.copy(v.clone().add(new THREE.Vector3(0, 1, 0)));
                        wheel.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-r + 90) * THREE.MathUtils.DEG2RAD);
                    }
                );
            }
        });
        socket.on("se", (a: { p: string; v: number }) => {
            const xplayer = a.p === socket.id ? localPlayer : clients.get(a.p);
            if (xplayer === undefined) return;
            xplayer.effect = 0;
            if (a.v === 4) {
                TWWEENS.deltaTime(deltaTime).playerScale(xplayer, 1);
            }

            if (xplayer.id === socket.id) {
                setEFFECT(localPlayer.effect);
            } else {
                if (a.v === 1) {
                    // Display Rocket!
                }
            }
        });
        socket.on("ae", (a: { p: string; e: number }) => {
            const xplayer = a.p === socket.id ? localPlayer : clients.get(a.p);
            if (xplayer === undefined) return;
            xplayer.stampedToTheGround(2);
        });
        socket.on("r", (args: { r: number; p: string }) => {
            const xplayer = args.p === socket.id ? localPlayer : clients.get(args.p);
            if (xplayer === undefined) return;

            xplayer.rounds = args.r;
            setROUNDS(localPlayer.rounds);

            if (args.r === 3) {
                //TODO: he won!
            }
        });
        socket.on("av", (args: [number, number, number]) => {
            log("recieved av");
            playerMovement.applyForces(new CANNON.Vec3(args[0], args[1], args[2]).scale(1));
        });
        socket.emit("i");
    }

    _socketInitiates();

    // @ts-ignore
    const cannonDebugger = new CannonDebugger(scene, world);

    const keysAxis = {
        horizontal: 0,
        vertical: 0,
    };
    const keysAxisRaw: {
        horizontal: number;
        vertical: number;
    } = { horizontal: 0, vertical: 0 };

    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const clock = new THREE.Clock();

    function _keyAxisHandle(deltaTime: number) {
        keysAxisRaw.horizontal = keysDown.has("KeyD") && keysDown.has("KeyA") ? 0 : keysDown.has("KeyD") ? 1 : keysDown.has("KeyA") ? -1 : 0;
        keysAxisRaw.vertical = keysDown.has("KeyW") && keysDown.has("KeyS") ? 0 : keysDown.has("KeyW") ? 1 : keysDown.has("KeyS") ? -1 : 0;

        {
            const gamepads = navigator.getGamepads();
            if (gamepads && !blur) {
                const gamepad = gamepads[settings.gamepadIndex];
                if (gamepad) {
                    // Map gamepad buttons to your existing input system
                    const buttonA = gamepad.buttons[0]; // Button A
                    const buttonB = gamepad.buttons[1]; // Button B
                    const buttonX = gamepad.buttons[2];
                    const buttonY = gamepad.buttons[3];

                    // Map gamepad axes to your existing input system
                    const horizontalAxis = gamepad.axes[0]; // Left analog stick horizontal axis
                    const verticalAxis = gamepad.axes[3]; // Right analog stick vertical axis
                    const rightTrigger = gamepad.buttons[7].value; // R2 - ZR
                    const leftTrigger = gamepad.buttons[6].value; // L2 - ZL

                    const npadRight = gamepad.buttons[15];
                    const npadLeft = gamepad.buttons[14];

                    keysAxisRaw.vertical =
                        rightTrigger && leftTrigger ? 0 : rightTrigger ? rightTrigger : leftTrigger ? -leftTrigger : keysAxisRaw.vertical;
                    keysAxisRaw.vertical = buttonA.pressed && buttonB.pressed ? 0 : buttonA.pressed ? 1 : buttonB.pressed ? -1 : keysAxisRaw.vertical;
                    keysAxisRaw.vertical = Math.abs(verticalAxis) > 0.05 ? -verticalAxis : keysAxisRaw.vertical;
                    keysAxisRaw.horizontal = Math.abs(horizontalAxis) > 0.05 ? horizontalAxis : keysAxisRaw.horizontal;
                    keysAxisRaw.horizontal =
                        npadLeft.pressed && npadRight.pressed ? 0 : npadRight.pressed ? 1 : npadLeft.pressed ? -1 : keysAxisRaw.horizontal;

                    if (buttonX.pressed || buttonY.pressed) {
                        _UseItem();
                    }
                }
            }
        }
        const x = keysAxisRaw;
        for (const key in Object.keys(keysAxis)) {
            const k = Object.keys(keysAxis)[key] as "horizontal" | "vertical";

            keysAxis[k] = lerp(keysAxis[k], x[k], deltaTime * 3);
        }
    }
    function _rotateICubes(fps: number) {
        for (const ib of iboxes) {
            if (ib[1].spin === false) continue;
            ib[1].mesh.rotateX((0.015 * 60) / fps);
            ib[1].mesh.rotateY((0.02 * 60) / fps);
            ib[1].mesh.rotateZ((0.01 * 60) / fps);
        }
    }
    function _mixerUpdate() {
        if (localPlayer.mixer != null) {
            localPlayer.mixer.update(0);
        }
        for (const xplayer of Array.from(clients.values())) {
            xplayer.mixer?.update(0);
        }
    }
    function _localPlayerMovement(fps: number) {
        cameraTarget.x = lerp(cameraTarget.x, localPlayer.body.position.x, 8 / fps);
        cameraTarget.y = lerp(cameraTarget.y, localPlayer.body.position.y + 2 * +(localPlayer.effect === 2), 12 / fps);
        cameraTarget.z = lerp(cameraTarget.z, localPlayer.body.position.z, 8 / fps);

        if (!localPlayer.spinning) {
            const thetha = localPlayer.rotation * THREE.MathUtils.DEG2RAD + keysAxis.horizontal * 0.2 * keysAxis.vertical;
            spherical.phi = (Math.PI * (0.6 + keysAxis.vertical / 20)) / 2;
            spherical.theta = thetha + Math.PI;
        }

        camera.position.setFromSpherical(spherical).add(cameraTarget);
        camera.lookAt(cameraTarget);

        camera.rotateZ(keysAxis.horizontal / 20);

        const _quaternion = new CANNON.Quaternion();
        _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), localPlayer.rotation * THREE.MathUtils.DEG2RAD);

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

        localPlayer.setPos(mapCurve.findClosestPointIndex(localPlayer.mesh.position), mapCurve.points.length - 1);
        setVEL(localPlayer.body.velocity.length());
        if (!localPlayer.moveable) return;
        if (localPlayer.body.position.y < -20) {
            TWWEENS.deltaTime(deltaTime).playerPosition(
                localPlayer,
                1000,
                mapCurve.getNearestPoint(Vec3ToVector3(localPlayer.body.position)).add(new THREE.Vector3(0, 10, 0))
            );
        }

        playerMovement.update(deltaTime, keysAxis, _quaternion);

        [...keysDown].forEach((k) => {
            // @ts-ignore
            keyHandlers.pressing[k]?.();
        });
    }
    function _UseItem() {
        const itemID = localPlayer.item;
        setITEM(false);
        localPlayer.item = false;

        socket?.emit("ui", itemID);
    }
    function _emitLocalPlayerPositions() {
        socket?.emit("m", {
            pos: localPlayer.body.position.toArray(),
            rot: localPlayer.rotation,
            side: keysAxis.horizontal,
            vel: localPlayer.body.velocity.toArray(),
        });
    }

    const animate = () => {
        deltaTime = clock.getDelta();
        fps = 1 / deltaTime;
        // Player Controls
        _keyAxisHandle(deltaTime);
        _rotateICubes(fps);
        _localPlayerMovement(fps);

        // Forground Display
        cannonDebugger.update();
        // _helper_roadPosInit();
        _emitLocalPlayerPositions();
        _mixerUpdate();

        // Setups
        if (settings.showFps) setFPS(fps);

        ItemCube.fps = fps;
        Player.fps = fps;
        Player.clients = clients;
        MapCurve.deltaTime = deltaTime;

        DISPLAY.CLEAR();
        DISPLAY.SET(localPlayer.body.id === localPlayer.carBody.id, localPlayer.body.mass);

        setPOS(mapCurve.rankPlayers([...Array.from(clients.values()), localPlayer]).get(socket ? socket.id : "") ?? 0);
        // setPOS(localPlayer.position);

        world.step(fps < 10 ? 1 / 60 : deltaTime);
        renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);
}
