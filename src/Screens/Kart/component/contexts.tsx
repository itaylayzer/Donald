import { createContext, useContext, useState } from "react";
import { Settings } from "../assets/types";

export type SettingsContextType = {
    settings: Settings;
    updateSettings: (newSettings: Settings) => Promise<Settings>;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useGameSettings must be used within a GameSettingsProvider");
    }
    return context;
};

function getGameSettingsFromCookies() {
    // Retrieve game settings from document.cookie
    const cookies = document.cookie.split(";");
    let savedSettings = {};
    cookies.forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key === "gameSettings") {
            try {
                savedSettings = JSON.parse(decodeURIComponent(value));
            } catch (error) {
                // Handle parsing error if needed
                console.error("Error parsing game settings from cookie:", error);
            }
        }
    });

    // Merge the saved settings with default settings
    const mergedSettings = { ...defaultSettings, ...savedSettings };
    return mergedSettings;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(getGameSettingsFromCookies());
    function updateSettings(newSettings: Settings) {
        return new Promise<Settings>((resolve, reject) => {
            try {
                setSettings({ ...settings, ...newSettings });
                requestAnimationFrame(() => {
                    resolve(settings);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    return (
        <SettingsContext.Provider
            value={{
                settings,
                updateSettings,
                setSettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

const defaultSettings = {
    videoScale: 1,
    fps: 120,
} as Settings;

export function saveGameSettingsToCookie(settings: Settings) {
    const settingsJSON = JSON.stringify(settings);
    const encodedSettings = encodeURIComponent(settingsJSON);

    // Define the cookie name
    const cookieName = "gameSettings";

    // Set the cookie with an expiration date (e.g., 30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const cookieValue = `${cookieName}=${encodedSettings}; expires=${expirationDate.toUTCString()}; path=/`;

    // Set the cookie in the document
    document.cookie = cookieValue;
}
