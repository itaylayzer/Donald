// REACT
import { useEffect, useRef, useState } from "react";

// THREE

import "./index.css";
import { Socket, io } from "./assets/socket.io.ts";
import main from "./assets/server.ts";
import { Item } from "./assets/types.ts";
import Game from "./scripts/game.ts";
import { SettingsProvider, defaultSettings, saveGameSettingsToCookie, useSettings } from "./component/contexts.tsx";
import SettingComp from "./component/settings.tsx";
import { meshes } from "./assets/inputs.ts";
import { CookieManager } from "../../assets/CookieManager.ts";
import Mark from "../../mark.tsx";
import { loadMeshes, loadedAssets } from "#Donald/assets/AssetLoader.ts";

export default function () {
    const [pId, setPId] = useState<null | ((v: number) => void)>();
    const inpRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        document.title = "Kart"
        const cookieName = `kartFirst`;
        const hasReset = new URLSearchParams(document.location.search).has("reset");
        if (hasReset) {
            CookieManager.set(cookieName, "false");
        }

        const firstUse = CookieManager.get(cookieName);
        console.log(firstUse);
        if (firstUse === null || firstUse === "false") {
            setPId(() => (v: number) => {
                if (v < 0) {
                    alert("error");
                } else {
                    defaultSettings;
                    saveGameSettingsToCookie({
                        ...defaultSettings,
                        volumes: [v, 100, 100],
                    });
                    CookieManager.set(cookieName, "true");
                    setPId(null);
                }
            });
        } else {
            setPId(null);
        }
    }, []);

    return (
        <>
            {pId === null ? (
                <ReactMenu />
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

function ReactMenu() {
    const [socket, SetSocket] = useState<Socket | undefined | null>(undefined);
    const [pvalue, SetProgress] = useState<number>(0);
    const [loadedMesh, SetLoadedMesh] = useState<loadedAssets | undefined>(undefined);
    const [tab, SetTab] = useState<number>(0);
    useEffect(() => {
        
        loadMeshes(meshes, SetProgress)
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

    return (
        <>
            {pvalue === 1 && loadedMesh !== undefined ? (
                <SettingsProvider>
                    {socket === undefined ? (
                        <div className="menu slider">
                            <nav>
                                <button
                                    data-selected={tab === 0}
                                    onClick={() => {
                                        SetTab(0);
                                    }}
                                >
                                    Play
                                </button>
                                <button
                                    data-selected={tab === 1}
                                    onClick={() => {
                                        SetTab(1);
                                    }}
                                >
                                    Settings
                                </button>
                            </nav>
                            <main>
                                {tab == 1 ? (
                                    <>
                                        <SettingComp />
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </main>
                        </div>
                    ) : (
                        <ReactGame
                            socket={socket}
                            meshes={loadedMesh}
                            exit={() => {
                                SetSocket(undefined);
                            }}
                        />
                    )}
                </SettingsProvider>
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

function ReactGame({ socket, meshes, exit }: { socket: Socket | null; meshes: loadedAssets; exit: () => void }) {
    const settingsContext = useSettings();

    // Logs
    const [consoles, SetConsoles] = useState<Array<string>>([]);
    const [displays, SetDisplays] = useState<Array<string>>([]);
    // Display
    const [fps, SetFPS] = useState<number>(0);
    const [velocityMeter, SetVelocityMeter] = useState<number>(0);
    const [gameItem, SetItem] = useState<Item>(false);
    const [effect, setEff] = useState<number>(0);
    const [playerPos, SetPos] = useState<number>(0);
    const [playerRounds, setRounds] = useState<number>(0);
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
        // console.log(...what);
        SetConsoles((old) => [newa, ...old]);
    }

    useEffect(() => {
        function waitForCanvas() {
            if (document.querySelector("div.gameContainer") != null) {
                Game({
                    socket: socket,
                    log: _console,
                    assets: meshes,
                    setFPS: SetFPS,
                    setVEL: SetVelocityMeter,
                    setITEM: SetItem,
                    setEFFECT: setEff,
                    setROUNDS: setRounds,
                    setPOS: SetPos,
                    DISPLAY: {
                        CLEAR() {
                            SetDisplays([]);
                        },
                        SET(...what: any[]) {
                            let newa: string = "";
                            for (const x of what) {
                                if (typeof x === "string") {
                                    newa += x;
                                } else {
                                    newa += JSON.stringify(x);
                                }
                                newa += "     ";
                            }
                            // console.log(...what);
                            SetDisplays((old) => [newa, ...old]);
                        },
                    },
                    settings: settingsContext.settings,
                });
            } else {
                requestAnimationFrame(waitForCanvas);
            }
        }
        requestAnimationFrame(waitForCanvas);

        return () => {
            document.location.reload();
        };
    }, [exit]);

    return (
        <>
            <div className="gameContainer"></div>

            <div className="gameUI" id="kart">
                <video id="troll" src="videos/troll.mp4"></video>
                <div className="left-bottom">{playerRounds}/3🏴</div>
                <div className="right-bottom">
                    <label>{playerPos}</label>rd
                </div>
                {settingsContext.settings.showFps ? (
                    <div className="right-top">
                        {fps.toFixed(0)} FPS {velocityMeter.toFixed(2)} CC
                    </div>
                ) : (
                    <></>
                )}
                <div className="left-top">
                    {effect}{" "}
                    <img
                        style={{ scale: "0.5" }}
                        src={
                            gameItem === 0
                                ? "sprites/star.png"
                                : gameItem === 1
                                ? "sprites/rocket.png"
                                : gameItem === 2
                                ? "sprites/stop.png"
                                : gameItem === 3
                                ? "sprites/wheel.png"
                                : gameItem === 4
                                ? "sprites/biggie.png"
                                : gameItem === 5
                                ? "sprites/troll.png"
                                : ""
                        }
                        alt=""
                    />
                </div>
                <div className="consoles">
                    {consoles.map((v) => (
                        <p>{v}</p>
                    ))}
                </div>
                <div className="displays">
                    {displays.map((v) => (
                        <p>{v}</p>
                    ))}
                </div>
            </div>
        </>
    );
}
