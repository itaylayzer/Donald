import { useEffect, useState } from "react";

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
type CustomLight = {
    color: THREE.ColorRepresentation;
    intensity: number;
    pos?: THREE.Vector3;
    rot?: THREE.Euler;
    type: "point" | "directional" | "ambient";
};

function App() {
    const [pvalue, SetProgress] = useState<number>(0);
    useEffect(() => {}, [pvalue]);
    useEffect(() => {
        function loadMeshes(items: { [key: string]: string }): Promise<{ [key: string]: THREE.Group<THREE.Object3DEventMap> }> {
            return new Promise((resolve, reject) => {
                const gltfloader = new FBXLoader();
                const l: { [key: string]: THREE.Group<THREE.Object3DEventMap> } = {};
                const s = Object.keys(items).length;
                let i = 0;
                let minerI = 0;
                for (const x of Object.entries(items)) {
                    gltfloader.load(
                        x[1],
                        (mesh1) => {
                            l[x[0]] = mesh1;

                            i += 1 / s;
                            minerI = 0;
                            SetProgress(i);
                        },
                        (progres) => {
                            minerI = progres.loaded / progres.total;
                            SetProgress(i + minerI);
                        },
                        (error) => {
                            reject(error);
                        }
                    );
                }

                gltfloader.manager.onLoad = () => {
                    console.log(`Loaded`, Array.from(Object.keys(l)));
                    resolve(l);
                };
            });
        }

        async function Game(meshes: { [key: string]: THREE.Group<THREE.Object3DEventMap> }) {
            const textureloader = new THREE.TextureLoader();

            const container = document.querySelector("div.gameContainer") as HTMLDivElement;
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog("white", 0, 15);

            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 30);
            const cameraPosition = new THREE.Vector3(0, 4, 6);
            camera.position.set(0, 4, 6).multiplyScalar(2);

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
            groundMesh.position.y -= 0.2;
            groundMesh.receiveShadow = true;

            scene.add(groundMesh);

            const definedMeshes = meshes as {
                player: THREE.Group<THREE.Object3DEventMap>;
                sleeping: THREE.Group<THREE.Object3DEventMap>;
            };
            const fbx = definedMeshes.player;
            fbx.castShadow = true;
            fbx.traverse((v) => {
                if (v.isObject3D) {
                    v.castShadow = true;
                }
            });
            fbx.scale.multiplyScalar(0.01);
            fbx.position.set(0, 0, 1.5);
            camera.lookAt(fbx.position);
            scene.add(fbx);
            const mixer = new THREE.AnimationMixer(fbx);
            const sleepingAnim = mixer.clipAction(definedMeshes.sleeping.animations[0]);
            console.log(sleepingAnim);
            sleepingAnim.play();
            sleepingAnim.weight = 1;
            console.log("started playing");
            // @ts-ignore
            globalThis.fbx = fbx;
            // @ts-ignore
            globalThis.sleepingAnim = sleepingAnim;
            // @ts-ignore
            globalThis.mixer = mixer;
            

            function createLights(c: CustomLight[]) {
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
                    intensity: 0.4,
                    type: "ambient",
                    rot: new THREE.Euler(0.9, 0.5, 0),
                },
            ]);
            scene.background = new THREE.Color("white");

            const animate = () => {
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
                 // @ts-ignore
                globalThis.mixer.update(0.01);
                camera.position.lerp(cameraPosition, 0.05);
            };
            window.addEventListener("resize", onWindowResize, false);

            function onWindowResize() {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();

                renderer.setSize(window.innerWidth, window.innerHeight);
            }

            animate();

            // gameLogic form here on
            document.body.style.cursor = "pointer";
            document.body.onclick = () => {
                document.body.onclick = () => {};
                document.body.style.cursor = "";

                // Wake Donald up!
                 // @ts-ignore
                globalThis.camera = camera;
                cameraPosition.multiplyScalar(0.7);
                cameraPosition.add(new THREE.Vector3(-2, 0, 0));
                SetProgress(2);
                // globalThis.sleepingAnim.stop();
            };
        }

        loadMeshes({
            player: "fbx/endy-rigged.fbx",
            sleeping: "fbx/animations/sleeping-anim.fbx",
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
                console.error(r);
            });

        return () => {
            document.location.reload();
        };
    }, []);

    return (
        <>
            {pvalue >= 1 ? (
                <>
                    {pvalue === 1 ? (
                        <>
                            <div className="gameContainer"></div>

                            <div className="gameUI">
                                <h3 className="center">Look at Donald</h3>
                                <p className="center floppinganim">Click to Wake him up..</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="gameContainer"></div>

                            <div className="gameUI">
                                <div className="Menu">
                                    <h3 style={{ fontSize: 60, left: "30%" }}>Lets Play</h3>
                                    <button style={{ backgroundImage: "url('raceb.png')" }} onClick={()=>{
                                       document.location.href += 'Kart';
                                    }}>Donald Kart</button>
                                    <button disabled style={{ backgroundImage: "url('party.png')" }}>
                                        Donald Party
                                    </button>
                                    <button disabled style={{ backgroundImage: "url('donald.png')" }}>
                                        Donald Mii
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="progress">
                    <h3>Loading</h3>
                    <main>
                        {" "}
                        <progress value={pvalue} max={1}></progress> <p>{(pvalue * 100).toFixed(2)}%</p>
                    </main>
                </div>
            )}

            <footer>@Coder-1t45 | 19.9.23</footer>
        </>
    );
}

export default App;
