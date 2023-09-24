// REACT
import { useEffect, useState } from "react";

// THREE
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

import "./index.css";
import { Socket, io } from "./assets/socket.io.ts";
import main from "./assets/server.ts";
import { loadedMesh } from "./assets/types.ts";
import Game from "./scripts/game";



export default function Main() {
    const [socket, SetSocket] = useState<Socket | undefined | null>(undefined);
    const [pvalue, SetProgress] = useState<number>(0);
    const [loadedMesh, SetLoadedMesh] = useState<loadedMesh | undefined>(undefined);
    useEffect(() => {
        function loadMeshes(items: { [key: string]: string }): Promise<loadedMesh> {
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
                }

                loadingManager.onLoad = () => {
                    console.log(`Loaded FBX`, Array.from(Object.keys(l.fbx)));
                    console.log(`Loaded GLTF`, Array.from(Object.keys(l.gltf)));

                    resolve(l);
                };
            });
        }

        loadMeshes({
            player: "fbx/endy-rigged.fbx",
            car: "fbx/motor.fbx",
            guess: "gltf/box/guess.gltf",
            sitting: "fbx/animations/sitting.fbx",
            xmap: "fbx/maps/xmap.fbx",
        })
            .then((v) => {
                SetLoadedMesh(v);
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

function App({ socket, meshes }: { socket: Socket | null; meshes: loadedMesh }) {
    const [consoles, SetConsoles] = useState<Array<string>>([]);
    const [] = useState<number>();
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
                    meshes: meshes,
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
                <div className="right-top">1234</div>
                <div className="consoles">
                    {consoles.map((v) => (
                        <p>{v}</p>
                    ))}
                </div>
            </div>
        </>
    );
}