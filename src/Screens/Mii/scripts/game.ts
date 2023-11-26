import { loadedAssets } from "#Donald/assets/AssetLoader";
import { CustomLight } from "../../Kart/assets/types";
import * as THREE from "three";
import { PointerMesh } from "../classess/PointerMesh";
import { CharactersList } from "../classess/characterList";
import { findBoneByName } from "../assets/functions";
import { Random } from "#Donald/Screens/Kart/assets/functions";
import { Player } from "../classess/Player";
import { CameraControl } from "../classess/cameraController";
import { Character } from "../classess/Character";

export type GameReturns = {};

export type Actions = {
    [key: string]:
        | {
              action: () => void;
              available: () => boolean;
          }
        | (() => void);
};

const GameStates = {
    Flying: 0,
    Editor: 1,
    Play: 2,
    Editing: 3,
};

export default function ({ assets, SetACTIONS }: { assets: loadedAssets; SetACTIONS: React.Dispatch<React.SetStateAction<Actions>> }): GameReturns {
    Character.font =  assets.fonts.roboto;
    // @ts-ignore
    globalThis.glassess = new THREE.Vector3();
    const container = document.querySelector("div.gameContainer") as HTMLDivElement;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("white", 50, 100);
    scene.background = new THREE.Color("white");

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(0, 1, 6).multiplyScalar(2);

    const raycaster = new THREE.Raycaster();

    Player.animationsPack = {
        idle: assets.fbx.pidle.animations[0],
        walking: assets.fbx.pwalk.animations[0],
        running: assets.fbx.prun.animations[0],
    };
    Character.camera = camera;

    let currentName = "";
    let currentState = GameStates.Flying;
    let currentPlayer: Player | null = null;
    const cameraController = new CameraControl(camera);

    const globalActions = {
        flying: {
            add: () => {
                const name = requestName();
                if (name === null) return;
                characters.add(name);
            },
            deleteAll: {
                action: () => {
                    characters.removeAll();
                },
                available: () => characters.count > 0,
            },
        } as Actions,
        editor: (c: Character) => {
            return {
                edit: () => {
                    currentState = GameStates.Editing;
                    SetACTIONS(globalActions.editing(c));
                },
                clone: async () => {
                    const name = requestName();
                    if (name === null) return;
                    const xchar = await characters.clone(c, name);
                    currentName = name;

                    currentState = GameStates.Editor;
                    document.exitPointerLock();
                    SetACTIONS(globalActions.editor(xchar));
                    // currentState = GameStates.Flying;
                    // SetACTIONS(globalActions.flying);
                },
                play: () => {
                    currentState = GameStates.Play;
                    renderer.domElement.requestPointerLock();

                    currentPlayer = new Player(c);
                    SetACTIONS({
                        back: () => {
                            currentState = GameStates.Flying;
                            SetACTIONS(globalActions.flying);
                            currentName = "";
                            _documentEvents();
                            currentPlayer?.destroy();
                            currentPlayer = null;
                        },
                    });
                    // Build The Play Scene!
                },
                remove: () => {
                    characters.remove(c.name);
                    SetACTIONS(globalActions.flying);
                    currentState = GameStates.Flying;
                },
                back: () => {
                    currentName = "";
                    currentState = GameStates.Flying;
                    SetACTIONS(globalActions.flying);
                },
            } as Actions;
        },
        editing: (c: Character) => {
            return {
                back: () => {
                    currentName = c.name;
                    currentState = GameStates.Editor;
                    SetACTIONS(globalActions.editor(c));
                },
            } as Actions;
        },
    };

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
                currentState = GameStates.Editor;
                document.exitPointerLock();
                SetACTIONS(globalActions.editor(c));
            };
            scene.add(c.mesh);
        },
        remove: (c) => {
            scene.remove(c);
        },
        addProp(p) {
            p.scale.multiplyScalar(0.01);
            scene.add(p);
        },
        animation: assets.fbx.idle.animations[0],
    });

    function requestName(): string | null {
        const name = prompt("Enter Character Name:");
        if (name !== null && characters.has(name)) {
            alert("Name Already Exists");
            return requestName();
        }
        return name;
    }

    SetACTIONS(globalActions.flying);

    const keyHandlers = {
        pressing: {},
        up: {},
        down: {
            Backspace: () => {
                currentName = "";
                currentState = GameStates.Flying;
                SetACTIONS(globalActions.flying);
            },
        },
    };
    const keysDown = new Set<string>();

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
            currentPlayer?.mouseMovement(event.movementX);
            if (currentState !== GameStates.Play) {
                cameraController.mouseMovement(event.movementX, event.movementY);
            }
        });
        document.onclick = (event) => {
            const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            raycaster.setFromCamera(mouse, camera);
            console.log(document.activeElement?.tagName);
            const l = PointerMesh.meshes.filter((v) => v.hover);
            if (l.length === 0) {
                if (currentState === GameStates.Play) {
                    currentPlayer ? (currentPlayer.down = true) : 0;

                    renderer.domElement.requestPointerLock();
                }
            } else {
                l.forEach((element) => {
                    element.onClick();
                });
            }
        };

        document.onpointerlockchange = () => {
            if (document.pointerLockElement === null) {
                if (currentState === GameStates.Play) currentPlayer ? (currentPlayer.down = false) : 0;
                if (currentState === GameStates.Flying) cameraController.down = false;
            }
        };

        document.onmousedown = (event) => {
            if (currentState === GameStates.Flying && event.button === 2) {
                renderer.domElement.requestPointerLock();
                cameraController.down = true;
            }
        };
        document.onmouseup = () => {
            cameraController.down = false;
            if (currentState === GameStates.Flying) document.exitPointerLock();
        };
        document.oncontextmenu = (event) => {
            event.preventDefault();
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
                // @ts-ignore
                globalActions.normal.add();
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

                    l.shadow.camera.near = 0.1;
                    l.shadow.camera.far = 1000;
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

    const clock = new THREE.Clock();
    const animate = () => {
        const deltaTime = clock.getDelta();

        function _movement() {
            if (currentState === GameStates.Play) {
                currentPlayer?.update(deltaTime, camera, keysDown);
            } else {
                const vec3 = currentName.length > 0 && characters.has(currentName) ? characters.getForced(currentName).position.clone() : undefined;
                if (currentState === GameStates.Editing && vec3) {
                    vec3.add(new THREE.Vector3(-2.5, 0, 0));
                }
                cameraController.update(deltaTime, vec3, keysDown);
            }
        }
        function _updateCharacters() {
            for (const xchars of Array.from(characters.list.entries())) {
                const bone = findBoneByName(xchars[1].mesh, "mixamorigHead");
                xchars[1].mixer.update(deltaTime * 1);
                for (const f of xchars[1].update){
                    f();
                }

                if ( document.pointerLockElement === null && (xchars[1].pointer.hover || currentName === xchars[1].name) && currentState !== GameStates.Play) {
                    if (!bone) continue;
                    bone.lookAt(new THREE.Vector3().unproject(camera));
                }
            }
        }

        _movement();
        _updateCharacters();

        renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(animate);

    function PromiseLoop(f: () => Promise<any>, i: number, callback?: (i: number) => void): Promise<void> {
        if (i > 0) {
            return f().then(() => {
                callback?.(i);
                return PromiseLoop(f, i - 1, callback);
            });
        } else {
            return Promise.resolve(); // Return a resolved promise when i <= 0
        }
    }
    // for (var i = 0; i < 10; i++) {
    //     const d = i;
    //     .then((v)=>{

    //         console.log(d,v.mesh.id);
    //     }).catch(r=>{
    //         console.error(r);
    //     });
    // }

    PromiseLoop(() => {
        return characters.add(Random.int(0, 1000) + `ayo` + Random.int(0, 1000).toString(), {
            glassess: 4,
            eyes: false,
            hair: 1,
            mouth: false,
        });
    }, 3).then(() => {
        requestAnimationFrame(() => {
            SetACTIONS(globalActions.flying);
        });
    });

    return {};
}
