import Mark from "#Donald/mark";
import { CookieManager } from "../../assets/CookieManager";
import { useEffect, useState } from "react";

import "./index.css";
import Game, {GameReturns as BrainType} from "./scripts/game";
import { loadMeshes, loadedAssets } from "#Donald/assets/AssetLoader";

function Mii({ l }: { l: loadedAssets }) {
    const [brain, SetBrain] = useState<BrainType>();
    
    useEffect(() => {
        SetBrain(
            Game({
                assets: l,
            })
        );
    }, []);

    
    const [currentIndex, SetIndex] = useState<number>(0);

    function UpdateIndex(x: number) {
        const _newIndex =Math.max( Math.min((brain?.maxINDEX??0),x),0);
        SetIndex(_newIndex);
        brain?.SetINDEX(_newIndex);
    }
    return (
        <>
            <div className="gameUI">
                <div className="right-center">
                    <button style={currentIndex == brain?.maxINDEX ? {display:"none"} : {}}
                        onClick={() => {
                            UpdateIndex(currentIndex + 1);
                        }}
                    >
                        {">"}
                    </button>
                </div>
                <div className="left-center">
                    <button style={currentIndex == 0 ? {display:"none"} : {}}
                        onClick={() => {
                            UpdateIndex(currentIndex - 1);
                        }}
                    >
                        {"<"}
                    </button>
                </div>
                <div className="actions">
                    <button>Edit</button>
                    <hr />
                    <button>Remove</button>
                </div>
            </div>
            <div className="gameContainer"></div>
        </>
    );
}

function Loading() {
    const [pvalue, SetProgress] = useState<number>(0);
    const [l, SetAssets] = useState<loadedAssets>();
    useEffect(() => {
        loadMeshes(
            {
                player: "fbx/endy-rigged-extra.fbx",
                idle: "fbx/animations/happy-idle.fbx",
                texture: "textures/bricks500x500x2.png",
            },
            SetProgress
        )
            .then((meshes) => {
                SetProgress(1);
                SetAssets(meshes);
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
            {pvalue >= 1 && l != undefined ? (
                <Mii l={l} />
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

function App() {
    const [pId, setPId] = useState<number>(0);
    const waitTime = 5000; // 10 seconds in milliseconds
    const maxPId = 2; // Set your desired maximum value for pId here

    useEffect(() => {
        document.title = "Mii";
        const cookieName = `miiFirst`;

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
                if (PID === maxPId) {
                    setPId(maxPId);
                    CookieManager.set(cookieName, "true");
                    document.removeEventListener("keydown", handleKeyPress);
                } else setPId(PID);
                clearTimeout(timerId);
                startNewTimer();
            }
        };

        const startNewTimer = () => {
            timerId = setTimeout(() => {
                PID++;
                if (PID === maxPId) {
                    setPId(maxPId);
                    CookieManager.set(cookieName, "true");
                    document.removeEventListener("keydown", handleKeyPress);
                } else setPId(PID);
                startNewTimer();
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
            {pId}
            {pId >= maxPId ? (
                <Loading />
            ) : (
                <article>
                    <main style={{ animation: "fade 5.1s cubic-bezier(.3,0,.3,1)" }} key={pId}>
                        {pId === 0 ? (
                            <h1>Welcome To Mii</h1>
                        ) : pId === 1 ? (
                            <>
                                <h2>This feature uses Cookies Constantly</h2>
                                <p>the more character you make the more memory this site will use</p>
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

export default App;
