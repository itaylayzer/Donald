import { useSettings, saveGameSettingsToCookie } from "./contexts";
import Slider from "../utils/slider";

export default function settingComp() {
    const settings = useSettings();
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
                            fps: settings.settings.fps,
                        });
                    }}
                />
            </div>
            <div className="slider">
                <p>max FPS </p>
                <Slider
                    defualtValue={settings.settings.fps}
                    fixed={0}
                    max={240}
                    min={30}
                    suffix="FPS"
                    step={10}
                    onValue={(d) => {
                        settings.updateSettings({
                            videoScale: settings.settings.videoScale,
                            fps: d,
                        });
                    }}
                />
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
