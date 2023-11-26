import { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { CookieManager } from "../assets/CookieManager";
import Mark from "../mark";
type CustomLight = {
    color: THREE.ColorRepresentation;
    intensity: number;
    pos?: THREE.Vector3;
    rot?: THREE.Euler;
    type: "point" | "directional" | "ambient";
};

export default function () {
    const [pId, setPId] = useState<undefined | number | ((v: number) => void)>(() => (v: number) => {
        if (v < 0) {
            alert("error");
        } else {
            setPId(v);
        }
    });
    const inpRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        console.log("starting");
    }, []);
    return (
        <>
            {typeof pId === "number" ? (
                <App volume={pId} />
            ) : (
                <article>
                    <main>
                        {typeof pId === "function" ? (
                            <>
                                <h5>please ajust master volume before continue</h5>
                                <input
                                    defaultValue={100}
                                    style={{ width: "80%", height: "3px" }}
                                    ref={inpRef}
                                    type="range"
                                    step={1}
                                    min={0}
                                    max={100}
                                />
                                <br />{" "}
                                <button
                                    style={{ marginTop: 20 }}
                                    onClick={() => {
                                        pId(inpRef.current ? inpRef.current.valueAsNumber : -1);
                                    }}
                                >
                                    Finished
                                </button>
                            </>
                        ) : (
                            <p>{typeof pId}</p>
                        )}
                    </main>
                </article>
            )}
            <Mark />
        </>
    );
}

function Intro() {
    const [pvalue, SetProgress] = useState<number>(0);
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
                    // console.log(`Loaded`, Array.from(Object.keys(l)));
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
            // console.log(sleepingAnim);
            sleepingAnim.play();
            sleepingAnim.weight = 1;
            // console.log("started playing");
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
                    if (document.querySelector("div.gameContainer") != null) {
                        Game(meshes);
                    } else {
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
                                    <button
                                        data-status={"Open Demo"}
                                        style={{ backgroundImage: "url('raceb.png')" }}
                                        onClick={() => {
                                            if (document.location.search.length > 0) {
                                                const s = document.location.search;
                                                document.location.href = document.location.href.replace(s, "") + `Kart${s}`;
                                            } else document.location.pathname += "Kart";
                                        }}
                                    >
                                        Donald Kart
                                    </button>
                                    <button disabled style={{ backgroundImage: "url('party.png')" }}>
                                        Donald Party
                                    </button>
                                    <button
                                        data-status={"Open Demo"}
                                        style={{ backgroundImage: "url('donald.png')" }}
                                        onClick={() => {
                                            if (document.location.search.length > 0) {
                                                const s = document.location.search;
                                                document.location.href = document.location.href.replace(s, "") + `Mii${s}`;
                                            } else document.location.pathname += "Mii";
                                        }}
                                    >
                                        Donald Mii
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <article className="progress">
                    <main>
                        <h3>Loading</h3>
                        <div>
                            <progress value={pvalue} max={1}></progress> <p>{(pvalue * 100).toFixed(2)}%</p>
                        </div>
                    </main>
                </article>
            )}
        </>
    );
}

function App({ volume }: { volume: number }) {
    const [pId, setPId] = useState<number>(0);
    const waitTime = 5000; // 5 seconds in milliseconds
    const maxPId = 2; // Set your desired maximum value for pId here

    useEffect(() => {
        // button click audio
        const clickOST = new Audio("sounds/futuristic-press.mp3");
        clickOST.volume = volume / 100;
        clickOST.currentTime = 0.22;
        clickOST.loop = false;
        clickOST.play();
        const windOST = new Audio("sounds/wind.mp3");
        windOST.volume = volume / 100;
        windOST.loop = true;
        windOST.play();
        const cookieName = `firstTime`;

        const hasReset = new URLSearchParams(document.location.search).has("reset");
        if (hasReset) {
            CookieManager.set(cookieName, "false");
        }

        const firstUse = !CookieManager.has(cookieName) || (CookieManager.has(cookieName) && CookieManager.getTyped<boolean>(cookieName) === false);
        if (!firstUse) {
            setPId(maxPId);
            return;
        }
        let timerId: number;
        let PID = 0;
        setPId(PID);
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
                PID++;
                console.log("enterPid", PID);
                setPId(PID);

                if (PID === maxPId) {
                    setPId(maxPId);
                    CookieManager.set(cookieName, "true");
                    document.removeEventListener("keydown", handleKeyPress);
                    clearTimeout(timerId);
                } else {
                    clearTimeout(timerId);
                    startNewTimer();
                }
            }
        };

        const startNewTimer = () => {
            timerId = setTimeout(() => {
                PID++;
                console.log("timerPid", PID);
                setPId(PID);

                if (PID === maxPId) {
                    setPId(maxPId);
                    CookieManager.set(cookieName, "true");
                    document.removeEventListener("keydown", handleKeyPress);
                } else {
                    startNewTimer();
                }
            }, waitTime);
        };

        document.addEventListener("keydown", handleKeyPress);

        startNewTimer(); // Start the initial timer

        return () => {
            document.removeEventListener("keydown", handleKeyPress);
            clearTimeout(timerId); // Clean up the timer on component unmount
        };
    }, []);

    return (
        <>
            {pId === maxPId ? (
                <Intro />
            ) : (
                <article>
                    <main style={{ animation: "fade-in 1s cubic-bezier(.3,0,.3,1)" }} key={pId}>
                        {pId === 0 ? (
                            <>
                                <h3>Donald failed asleep</h3>
                                <h4>waiting for Someone who forgot him.</h4>
                            </>
                        ) : pId === 1 ? (
                            <>
                                <h2>This site uses Cookies</h2>
                                <p>we wont gather any password or emails</p>
                            </>
                        ) : (
                            <></>
                        )}
                    </main>
                </article>
            )}
            <Mark />
        </>
    );
}
