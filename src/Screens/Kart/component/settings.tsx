import { useSettings, saveGameSettingsToCookie } from "./contexts";
import Slider from "../utils/slider";
import { useEffect, useState } from "react";

export default function settingComp() {
    const settings = useSettings();
    const gamepadsArr = useState<Array<null | Gamepad>>(navigator.getGamepads().filter((v) => v !== null));
    useEffect(() => {
        const handleGamepadChange = () => {
            gamepadsArr[1](navigator.getGamepads().filter((v) => v !== null));
        };

        window.addEventListener("gamepadconnected", handleGamepadChange);
        window.addEventListener("gamepaddisconnected", handleGamepadChange);

        // Cleanup the event listeners when the component unmounts
        return () => {
            window.removeEventListener("gamepadconnected", handleGamepadChange);
            window.removeEventListener("gamepaddisconnected", handleGamepadChange);
        };
    }, []);
    return (
        <>
            {" "}
            <h2>Audio</h2>
            <div className="slider">
                <p>master audio </p>
                <Slider defualtValue={100} fixed={0} max={100} min={0} suffix="%" step={5} />
            </div>
            <div className="slider">
                <p>sfx audio </p>
                <Slider defualtValue={25} fixed={0} max={100} min={0} suffix="%" step={5} />
            </div>
            <div className="slider">
                <p>music audio </p>
                <Slider defualtValue={75} fixed={0} max={100} min={0} suffix="%" step={5} />
            </div>
            <h2>Graphics</h2>
            <div className="slider">
                <p>graphics scale </p>
                <Slider
                    defualtValue={settings.settings.videoScale * 100}
                    fixed={0}
                    max={200}
                    min={5}
                    suffix="%"
                    step={5}
                    onValue={(d) => {
                        settings.updateSettings({
                            videoScale: d / 100,
                            fpsCap: settings.settings.fpsCap,
                            gamepadIndex: settings.settings.gamepadIndex,
                            showFps:settings.settings.showFps
                        });
                    }}
                />
            </div>
            
            <div className="slider">
                <p>max FPS </p>
                <Slider
                    defualtValue={settings.settings.fpsCap}
                    fixed={0}
                    max={240}
                    min={30}
                    suffix="FPS"
                    step={10}
                    onValue={(d) => {
                        settings.updateSettings({
                            videoScale: settings.settings.videoScale,
                            fpsCap: d,
                            gamepadIndex: settings.settings.gamepadIndex,
                            showFps:settings.settings.showFps
                        });
                    }}
                />
            </div>
            <div className="slider">
                <p>show FPS </p>
                <input
                type="checkbox"
                    defaultChecked={settings.settings.showFps}
                    onChange={(e) => {
                        console.log(e.currentTarget.checked);
                        settings.updateSettings({
                            videoScale: settings.settings.videoScale,
                            fpsCap: settings.settings.fpsCap,
                            gamepadIndex: settings.settings.gamepadIndex,
                            showFps:e.currentTarget.checked
                        });
                    }}
                />
            </div>
            <h2>Controls</h2>
            <div className="slider">
                <p>selected Gamepad </p>
                <select
                    name=""
                    id=""
                    defaultValue={settings.settings.gamepadIndex}
                    onChange={(e) => {
                        console.log(`change selected to ${parseInt(e.currentTarget.value)}`);
                        settings.updateSettings({
                            videoScale: settings.settings.videoScale,
                            fpsCap: settings.settings.fpsCap,
                            gamepadIndex: parseInt(e.currentTarget.value),
                            showFps:settings.settings.showFps
                        });
                    }}
                >
                    {gamepadsArr[0].length > 0 ? (
                        gamepadsArr[0].map((v, index) => (
                            <option key={"gamepad" + index} value={index}>
                                {v?.id}
                            </option>
                        ))
                    ) : (
                        <option> Theres no Gamepad Connected </option>
                    )}
                </select>
            </div>
            <button
                onClick={() => {
                    saveGameSettingsToCookie(settings.settings);
                    alert("saved");
                }}
            >
                Save in Cookies
            </button>
        </>
    );
}
