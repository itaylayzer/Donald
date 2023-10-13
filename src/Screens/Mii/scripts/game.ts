import { loadedAssets } from "#Donald/assets/AssetLoader";
import { CustomLight } from "../../Kart/assets/types";
import * as THREE from "three";
import { PointerMesh } from "../classess/PointerMesh";
import { CharactersList } from "../classess/Character";
import { findBoneByName } from "../assets/functions";
import { Random } from "#Donald/Screens/Kart/assets/functions";
import { lerp } from "three/src/math/MathUtils.js";

export type GameReturns = {
    SetINDEX: (v: number) => void;
    maxINDEX: number;
    addCharacter: (name: string) => void;
};

export default function ({ assets }: { assets: loadedAssets }): GameReturns {
    // @ts-ignore
    globalThis.glassess = new THREE.Vector3();
    const container = document.querySelector("div.gameContainer") as HTMLDivElement;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("white", 10, 40);
    scene.background = new THREE.Color("white");

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 30);
    const cameraPosition = new THREE.Vector3(0, 10, 10);
    camera.position.set(0, 1, 6).multiplyScalar(2);

    const raycaster = new THREE.Raycaster();

    const characters = new CharactersList(assets.fbx.player, {
        add: (c) => {
            c.mesh.castShadow = true;
            c.mesh.traverse((v) => {
                if (v.isObject3D) {
                    v.castShadow = true;
                }
            });
            c.mesh.scale.multiplyScalar(0.01);
            c.mesh.position.set(Random.int(-10, 10), 0, Random.int(-10, 0));
            c.pointer.onClick = () => {
                if (characters.has(currentName)) return;
                currentName = c.name;
            };
            scene.add(c.mesh);
        },
        remove: (c) => {
            scene.remove(c.mesh);
        },
        addProp(p) {
            p.scale.multiplyScalar(0.01);
            scene.add(p);
        },
        animation: assets.fbx.idle.animations[0],
    });

    let currentName = "";

    const keyHandlers = {
        pressing: {},
        up: {},
        down: {
            Backspace: () => {
                currentName = "";
            },
        },
    };
    const keysDown = new Set<string>();
    const keysAxis = {
        horizontal: 0,
        vertical: 0,
    };
    const keysAxisRaw = { horizontal: 0, vertical: 0 };
    function _createGround() {
        var texture = assets.textures.texture.clone();
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
        groundMesh.position.y -= 0.2;
        groundMesh.receiveShadow = true;

        scene.add(groundMesh);
    }
    function _documentEvents() {
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
        document.addEventListener("mousemove", (event) => {
            const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            raycaster.setFromCamera(mouse, camera);
            raycaster.far = 10000000;
            raycaster.near = 0.01;

            const EOD = -1;
            let minIndex = EOD;
            let minDistance = 10000000;
            for (const xplayer of PointerMesh.meshes.entries()) {
                const intersects = raycaster.intersectObject(xplayer[1].mesh);
                if (intersects.length > 0) {
                    const sortedIntersects = intersects.sort((a, b) => a.distance - b.distance);
                    if (minDistance > sortedIntersects[0].distance) {
                        minIndex = xplayer[0];
                    }
                }
            }
            PointerMesh.meshes
            // @ts-ignore
                .filter((v, i) => i !== minIndex)
                .forEach((element) => {
                    element.setHover(false);
                });
            document.body.style.cursor = "default";
            if (minIndex !== EOD) {
                if (!characters.has(currentName)) document.body.style.cursor = "pointer";
                PointerMesh.meshes[minIndex].setHover(true);
            }
        });
        document.onclick = (event) => {
            const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            raycaster.setFromCamera(mouse, camera);

            PointerMesh.meshes
                .filter((v) => v.hover)
                .forEach((element) => {
                    element.onClick();
                });
        };

        window.addEventListener(
            "resize",
            () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();

                renderer.setSize(window.innerWidth, window.innerHeight);
            },
            false
        );
        document.addEventListener("keydown", (e) => {
            if (e.code === "KeyN") {
                const name = prompt("Enter Name") as string;
                characters.add(name);
            }
        });
    }
    function _createLights() {
        (function (c: CustomLight[]) {
            for (const x of c) {
                let l;
                if (x.type === "directional") {
                    l = new THREE.DirectionalLight(x.color, x.intensity);
                    l.castShadow = true;
                    l.receiveShadow = true;
                    l.shadow.mapSize.width = 1024;
                    l.shadow.mapSize.height = 1024;

                    l.shadow.camera.near = 5;
                    l.shadow.camera.far = 10;
                    l.castShadow = true;
                } else if (x.type === "point") {
                    l = new THREE.PointLight(x.color, x.intensity);
                    l.castShadow = true;
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
                intensity: 0.4,
                type: "ambient",
                rot: new THREE.Euler(0.9, 0.5, 0),
            },
        ]);
    }

    _createGround();
    _documentEvents();
    _createLights();

    cameraPosition.set(0, 9, 10);
    const cameraRotation = new THREE.Euler();
    const clock = new THREE.Clock();
    const animate = () => {
        const deltaTime = clock.getDelta();

        function _keyAxisHandle() {
            keysAxisRaw.horizontal = keysDown.has("KeyD") && keysDown.has("KeyA") ? 0 : keysDown.has("KeyD") ? 1 : keysDown.has("KeyA") ? -1 : 0;
            keysAxisRaw.vertical = keysDown.has("KeyW") && keysDown.has("KeyS") ? 0 : keysDown.has("KeyW") ? 1 : keysDown.has("KeyS") ? -1 : 0;
            for (const key in Object.keys(keysAxis)) {
                const k = Object.keys(keysAxis)[key] as "horizontal" | "vertical";

                keysAxis[k] = lerp(keysAxis[k], keysAxisRaw[k], deltaTime * 3);
            }
        }
        function _cameraMovement() {
            if (currentName.length > 0 && characters.has(currentName)) {
                cameraRotation.x = -0.3;
                cameraRotation.z = 0;
                cameraRotation.y = 0;
                cameraPosition.lerp(characters.getForced(currentName).position.clone().add(new THREE.Vector3(2, 3, 3)), deltaTime * 5);
            } else {
                cameraPosition.add(new THREE.Vector3(keysAxis.horizontal, 0, -keysAxis.vertical).multiplyScalar(deltaTime * 20));
                cameraPosition.setY(lerp(cameraPosition.y, 11, deltaTime * 5));
                cameraRotation.x = -0.7 + -keysAxisRaw.vertical * 0.05;
                cameraRotation.z = -keysAxisRaw.horizontal * 0.05;
            }
            camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(cameraRotation), deltaTime * 2);
            // @ts-ignore
            globalThis.camera = camera;
            camera.position.lerp(cameraPosition, deltaTime * 5);
        }
        function _updateCharacters() {
            for (const xchars of Array.from(characters.list.entries())) {
                const bone = findBoneByName(xchars[1].mesh, "mixamorigHead");

                xchars[1].mixer.update(deltaTime * 0.33);
                xchars[1].update();
                if (xchars[1].pointer.hover || currentName === xchars[1].name) {
                    if (!bone) continue;
                    const oldQuaternion = bone.quaternion.clone();
                    bone.lookAt(new THREE.Vector3().unproject(camera));
                    const newQuaternion = bone.quaternion.clone();
                    bone.quaternion.copy(oldQuaternion);
                    bone.quaternion.copy(bone.quaternion.slerp(newQuaternion, 0.5));

                };
            }
        }

        _keyAxisHandle();
        _cameraMovement();
        _updateCharacters();

        renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    function PromiseLoop(f:()=>Promise<any>, i:number,any:(i:number)=>void){
        if (i <= 0) return;
        f().then(()=>{
            any(i);
            PromiseLoop(f,i-1, any);
        })
    }
    // for (var i = 0; i < 10; i++) {
    //     const d = i;
    //     .then((v)=>{
            
    //         console.log(d,v.mesh.id);
    //     }).catch(r=>{
    //         console.error(r);
    //     });
    // }
    let il = 0;
    PromiseLoop(()=>{
        return characters.add(`ayo ${il}`, {
            glassess: 3,
            eyes: false,
            hair: false,
            mouth: false,
        })
    },10, (i)=>{
        il++;
        console.log(i);
    });

    return {
        SetINDEX(v) {
            if (v >= 0 && v < characters.count) {
            }
        },
        maxINDEX: characters.count - 1,
        addCharacter(name) {
            characters.add(name);
        },
    };
}
