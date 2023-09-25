// REACT
import { useEffect, useState } from "react";

// THREE
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import "./index.css";
import { Socket, io } from "./assets/socket.io.ts";
import main from "./assets/server.ts";
import { loadedAssets } from "./assets/types.ts";
import Game from "./scripts/game";

export default function Main() {
    const [socket, SetSocket] = useState<Socket | undefined | null>(undefined);
    const [pvalue, SetProgress] = useState<number>(0);
    const [loadedMesh, SetLoadedMesh] = useState<loadedAssets | undefined>(undefined);
    useEffect(() => {
        function loadMeshes(items: { [key: string]: string }): Promise<loadedAssets> {
            return new Promise((resolve, reject) => {
                const loadingManager = new THREE.LoadingManager();
                const gltfLoader = new GLTFLoader(loadingManager);
                const fbxLodaer = new FBXLoader(loadingManager);
                const textureLoader = new THREE.TextureLoader(loadingManager);
                const l = {
                    gltf: {},
                    fbx: {},
                    textures:{}
                } as loadedAssets;
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
                                SetProgress(i + minerI / s);
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
                                SetProgress(i + minerI / s);
                            }, // onProgress callback (useful for progress tracking)
                            (error) => {
                                reject(error); // Reject the promise if there's an error
                            }
                        );
                    }
                    else if (x[1].endsWith(".png")){
                        textureLoader.load(
                            x[1],
                            (mesh1) => {
                                l.textures[x[0]] = mesh1;

                                i += 1 / s;
                                minerI = 0;
                                SetProgress(i);
                            },
                            (progres) => {
                                minerI = progres.loaded / progres.total;
                                SetProgress(i + minerI / s);
                            }, // onProgress callback (useful for progress tracking)
                            (error) => {
                                reject(error); // Reject the promise if there's an error
                            }
                        );
                    }
                }

                loadingManager.onLoad = () => {
                    console.log(`Loaded FBX`, JSON.stringify(Array.from(Object.keys(l.fbx))));
                    console.log(`Loaded GLTF`,JSON.stringify(Array.from(Object.keys(l.gltf))));
                    console.log(`Loaded Textures`, JSON.stringify(Array.from(Object.keys(l.textures))));
                    SetProgress(1);
                    resolve(l);
                };
            });
        }

        loadMeshes({
            player: "fbx/endy-rigged.fbx",
            car: "fbx/motor.fbx",
            guess: "gltf/box/guess.gltf",
            sitting: "fbx/animations/sitting.fbx",
            xmap: "fbx/maps/xmap4.fbx",
            ground:"textures/bricks500x500x2.png"
        })
            .then((v) => {
                SetLoadedMesh(v);

                if (document.location.search.length > 0 && document.location.search.includes("null")) {
                    main(async (host) => {
                        const socket = await io(host);
                        SetSocket(socket);
                        navigator.clipboard.writeText(host);
                    });
                }
            })
            .catch((r) => {
                console.error(r);
            });
    }, []);

    return pvalue === 1 && loadedMesh !== undefined ? (
        <>
            {socket === undefined ? (
                <div className="menu">
                    <main>
                        <button
                            onClick={async () => {
                                const ip = await navigator.clipboard.readText();
                                if (ip === null) return;
                                const socket = await io(ip);
                                SetSocket(socket);
                            }}
                        >
                            JOIN
                        </button>
                        <button
                            onClick={() => {
                                main(async (host) => {
                                    const socket = await io(host);
                                    SetSocket(socket);
                                    navigator.clipboard.writeText(host);
                                });
                            }}
                        >
                            CREATE
                        </button>
                    </main>
                </div>
            ) : (
                <App socket={socket} meshes={loadedMesh} />
            )}
        </>
    ) : (
        <div className="progress">
            <h3>Loading</h3>
            <main>
                <progress value={pvalue} max={1}></progress> <p>{(pvalue * 100).toFixed(2)}%</p>
            </main>
        </div>
    );
}

function App({ socket, meshes }: { socket: Socket | null; meshes: loadedAssets }) {
    const [consoles, SetConsoles] = useState<Array<string>>([]);
    const [fps, SetFPS] = useState<number>(0);
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
        function waitForCanvas() {
            if (document.querySelector("div.gameContainer") != null) {
                Game({
                    socket: socket,
                    log: _console,
                    assets: meshes,
                    setFPS: SetFPS,
                });
            } else {
                requestAnimationFrame(waitForCanvas);
            }
        }
        requestAnimationFrame(waitForCanvas);

        return () => {
            document.location.reload();
        };
    }, []);

    return (
        <>
            <div className="gameContainer"></div>

            <div className="gameUI" id="kart">
                <div className="right-bottom">
                    <p>3rd</p>
                </div>
                <div className="left-bottom">
                    <p> 3</p>
                </div>
                <div className="right-top">{fps.toFixed(0)} FPS</div>
                <div className="consoles">
                    {consoles.map((v) => (
                        <p>{v}</p>
                    ))}
                </div>
            </div>
        </>
    );
}
