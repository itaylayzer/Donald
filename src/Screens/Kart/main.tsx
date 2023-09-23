import { useState } from "react";
import App from "./app.tsx";
import "./index.css";
import { Socket, io } from "./assets/websockets.ts";
import main from "./assets/server.ts";

export default function Main() {
    const [socket, SetSocket] = useState<Socket | undefined | null>(undefined);
    return socket === undefined ? (
        <div className="menu">
            <main>
                <button
                    onClick={async () => {
                        // const ip = prompt("ip");
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
                            // alert(host);
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
        <App socket={socket} />
    );
}