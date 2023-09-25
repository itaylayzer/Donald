import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Socket } from "../assets/socket.io";
import { QuaternionToQuat, RotToQuat, Vector3ToVec3 } from "../assets/functions";
import CannonDebugger from "../utils/cannonDebugRenderer";
import { lerp } from "three/src/math/MathUtils.js";
import { Player } from "./player";
import { CustomLight, IBoxList, loadedAssets } from "../assets/types";
import { filtersDefenitions as filters } from "../assets/filters";
import { ItemCube } from "./itemCube";

export default function Game({
    socket,
    log,
    assets,
    setFPS,
}: {
    socket: Socket | null;
    assets: loadedAssets;
    log: (...x: any[]) => void;
    setFPS: React.Dispatch<number>;
}) {
    const container = document.querySelector("div.gameContainer") as HTMLDivElement;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 0); // Adjust the position as needed
    camera.lookAt(0, 0, 0); // Make the camera look at the center (0, 0, 0)
    const spherical = new THREE.Spherical(6, Math.PI, 0); // Initial spherical coordinates (radius, polar angle, azimuthal angle)
    scene.background = new THREE.Color("white");
    // scene.fog = new THREE.Fog("white", 20, 100);

    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -50, 0),
    });

    function createCannonFromGeometry(
        geometry: THREE.BufferGeometry,
        options?: {
            quaternion?: THREE.Quaternion;
            position?: THREE.Vector3;
            rotation?: THREE.Euler;
        }
    ) {
        // Convert Three.js geometry to CANNON.js format.
        const vertices = Array.from(new Float32Array(geometry.attributes.position.array).values());
        // const normals = Array.from(new Float32Array(geometry.attributes.normal.array).values());
        const faces = (geometry.index ? new Uint16Array(geometry.index.array) : []) as number[];
        console.log(faces);
        const shape = new CANNON.Trimesh(vertices, faces);

        // Create a CANNON body for the mesh.
        const body = new CANNON.Body({ mass: 0 }); // Set mass to 0 for a static object.
        body.addShape(shape);
        if (options) {
            if (options.position) {
                body.position = Vector3ToVec3(options.position);
            }
            if (options.quaternion) {
                body.quaternion = QuaternionToQuat(options.quaternion);
            } else if (options.rotation) {
                body.quaternion = RotToQuat(options.rotation);
            }
        }

        return body;
    }

    Player.onNew = (x: Player) => {
        if (x.mesh != null) addMesh(x.mesh);
        world.addBody(x.body);
        x.carBody ? world.addBody(x.carBody) : "";
        x.body.position.set(0, 10, 0);
    };
    ItemCube.onNew = (x) => {
        addMesh(x.mesh);
        world.addBody(x.body);
    };

    let meshesArr: THREE.Object3D[] = [];
    function addMesh(...object: THREE.Object3D[]) {
        meshesArr.push(...object);

        scene.add(...object);
    }

    const definedFbxs = assets.fbx as {
        player: THREE.Group;
        car: THREE.Group;
        sitting: THREE.Group;
        xmap: THREE.Group;
    };

    const loadedMeshes: {
        [key: string]: {
            body: CANNON.Body | CANNON.Body[];
            mesh: THREE.Mesh | THREE.Mesh[];
        };
    } = {};

    const clients = new Map<string, Player>();
    const iboxes = new Map<string, ItemCube>();

    const keyHandlers = {
        pressing: {},
        up: {},
        down: {},
    };
    const keysDown = new Set<string>();

    function _createGround() {
        var texture = assets.textures["ground"];
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

            collisionFilterGroup: filters.ground,
            collisionFilterMask: filters.ground | filters.carBody | filters.localCarBody,
        });

        scene.add(groundMesh);
        world.addBody(groundBody);
    }
    function _loadMesh() {
        for (const x of Object.entries(assets.gltf)) {
            const _mesh = x[1].scene.children[0]; // Assuming there's only one mesh in the GLTF

            if (_mesh.children.length > 0) {
                log("_mesh.children.length > 0", x[0], _mesh.children.length);

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
        definedFbxs.xmap.scale.multiplyScalar(0.01);
        // @ts-ignore
        globalThis.xmap = definedFbxs.xmap;
        if (definedFbxs.xmap.children[0] as THREE.Mesh) {
            console.log((definedFbxs.xmap.children[0] as THREE.Mesh).geometry);
            const xmapBody = createCannonFromGeometry((definedFbxs.xmap.children[0] as THREE.Mesh).geometry, {
                position: definedFbxs.xmap.position,
                rotation: new THREE.Euler().setFromVector3(
                    new THREE.Vector3().setFromEuler(definedFbxs.xmap.rotation).add(new THREE.Vector3(-Math.PI / 2, 0, 0))
                ),
            });
            // (definedFbxs.xmap.children[0] as THREE.Mesh).material = groundMesh.material;
            xmapBody.mass = 0;
            xmapBody.collisionFilterGroup = filters.ground;
            xmapBody.collisionFilterMask = filters.ground | filters.carBody | filters.localCarBody;
            world.addBody(xmapBody);
            log("added body!");
        }
        // scene.add(definedFbxs.xmap);
    }
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
            for (const x of keysDown) {
                keysDown.delete(x);
            }
        };
        window.onresize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

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

    const localPlayer = new Player(socket !== null ? socket.id : "", true);
    {
        const sittingPose = localPlayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
        
        sittingPose.play();
    }
    
   
    function _socketInitiates(){
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
                const itemCube = new ItemCube(xl.mesh, x[1].pos, x[1].available, (event: { body: CANNON.Body | undefined }) => {
                    if ((event.body ? event.body.id : "") === localPlayer.carBody?.id) {
                        socket.emit("b", x[0]);
                    }
                });
    
                iboxes.set(x[0], itemCube);
            }
            clients.set(socket.id, localPlayer);
        });

        socket.on("ba", (a: { id: string; av: boolean }) => {
            const xbox = iboxes.get(a.id);
            if (xbox === undefined) return;
    
            if (a.av !== xbox.available) {
                if (a.av) {
                    xbox.appear(() => {
                        addMesh(xbox.mesh);
                        world.addBody(xbox.body);
                    });
                } else {
                    xbox.disapear(
                        () => {
                            world.removeBody(xbox.body);
                        },
                        () => {
                            scene.remove(xbox.mesh);
                        }
                    );
                }
            }
    
            xbox.available = a.av;
        });
        socket.on("n-p", (x: string) => {
            const xplayer = new Player(x);
            const sittingPose = xplayer.mixer.clipAction(definedFbxs.sitting.animations[0]);
            sittingPose.play();
    
            clients.set(x, xplayer);
        });
        socket.on("m", (args: { pos: [number, number, number]; rot: number; id: string }) => {
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
        socket.on("p-dis", (id: string) => {
            const xplayer = clients.get(id);
            if (xplayer === undefined) return;
            clients.delete(id);
            world.removeBody(xplayer.body);
            if (xplayer.mesh != null) scene.remove(xplayer.mesh);
        });
        socket.on("br", () => {});
        socket.emit("i");
    }

    _socketInitiates();

    // @ts-ignore
    const cannonDebugger = new CannonDebugger(scene, world);

    const keysAxis = {
        horizontal: 0,
        vertical: 0,
    };
    let rotation = 180;
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const clock = new THREE.Clock();

    function _keyAxisHandle(){
        const keysAxisRaw = {
            horizontal: keysDown.has("KeyD") && keysDown.has("KeyA") ? 0 : keysDown.has("KeyD") ? 1 : keysDown.has("KeyA") ? -1 : 0,
            vertical: keysDown.has("KeyW") && keysDown.has("KeyS") ? 0 : keysDown.has("KeyW") ? 1 : keysDown.has("KeyS") ? -1 : 0,
        };
        const x = keysAxisRaw;
        for (const key in Object.keys(keysAxis)) {
            const k = Object.keys(keysAxis)[key] as "horizontal" | "vertical";

            keysAxis[k] = lerp(keysAxis[k], x[k], 0.05);
        }
    }
    function _rotateICubes(){
        for (const ib of iboxes) {
            if (ib[1].spin === false) continue;
            ib[1].mesh.rotateX(0.015);
            ib[1].mesh.rotateY(0.02);
            ib[1].mesh.rotateZ(0.01);
        }
    }
    function _mixerUpdate(){
        if (localPlayer.mixer != null) {
            localPlayer.mixer.update(0);
        }
        for (const xplayer of Array.from(clients.values())) {
            xplayer.mixer?.update(0);
        }
    }

    function _localPlayerMovement(){
        
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
    }

    function _emitLocalPlayerPositions(){
        socket?.emit("m", {
            pos: [localPlayer.body.position.x, localPlayer.body.position.y, localPlayer.body.position.z],
            rot: rotation,
        });
    }


    const animate = () => {
        
        // Player Controls
        _keyAxisHandle();
        _rotateICubes();
        _localPlayerMovement();

        // Forground Display
        // cannonDebugger.update();
        _emitLocalPlayerPositions();
        _mixerUpdate();

        // Setups
        setFPS(1 / clock.getDelta());
        world.step(1 / 60);
        renderer.render(scene, camera);
    };
    

    renderer.setAnimationLoop(animate);
}
