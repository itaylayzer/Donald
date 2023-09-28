import { IBoxList, ItemBox } from "./types";
import { Server, Socket } from "./socket.io";
import { calculateRotationMatrix, Random } from "./functions";

function createCube(
    arr: Array<{
        count: number;
        mainPosition: [number, number, number];
        mainRotation: [number, number, number];
        gap: number;
    }>
): IBoxList {
    const cubes: Array<ItemBox> = [];

    for (const cube of arr) {
        for (var i = -(cube.count - 1) / 2; i < cube.count / 2; i++) {
            const [roll, pitch, yaw] = cube.mainRotation;
            const [mX, mY, mZ] = cube.mainPosition;

            const rotationMatrix = calculateRotationMatrix(roll, pitch, yaw);

            const x = mX + cube.gap * i * rotationMatrix[0][0];
            const y = mY + cube.gap * i * rotationMatrix[0][1];
            const z = mZ + cube.gap * i * rotationMatrix[0][2];
            cubes.push({
                pos: [x, y, z],
                available: true,
            });
        }
    }

    return Object.fromEntries(cubes.entries());
}

export default function main(finished: (host: string) => void) {
    const clients = new Map<string, Socket>();
    const cubes = createCube([
        {
            count: 5,
            mainPosition: [0, 2, 3],
            gap: 4,
            mainRotation: [Math.PI / 2, 0, 0],
        },
        {
            count: 5,
            mainPosition: [0, 2, -20],
            gap: 4,
            mainRotation: [Math.PI / 2, 0, 0],
        },
    ]);
    const EmitExcept = (id: string, name: string, args?: any) => {
        for (const x of Array.from(clients.values())) {
            if (x.id !== id) {
                x.emit(name, args);
            }
        }
    };
    const EmitAll = (name: string, args?: any) => {
        for (const x of Array.from(clients.values())) {
            x.emit(name, args);
        }
    };
    new Server(
        (host, server) => {
            finished(host);
            server.code = host;
            return undefined;
        },
        (s) => {
            // initiate
            s.on("i", () => {
                s.emit("i", { p: Array.from(clients.keys()), c: cubes });
                EmitAll("n-p", s.id);
                clients.set(s.id, s);
            });
            // movements
            s.on("m", (args: { pos: [number, number, number]; rot: number }) => {
                EmitExcept(s.id, "m", { ...args, id: s.id });
            });
            // disconnect
            s.on("disconnect", () => {
                EmitExcept(s.id, "p-dis", s.id);
                clients.delete(s.id);
            });
            // box collides with the socket
            s.on("b", (id: string) => {
                if (Object.keys(cubes).includes(id)) {
                    cubes[id].available = false;
                    // box availablity
                    EmitAll("ba", { id, av: cubes[id].available });
                    // box random result
                    const br = 
                    Random.possibilities({
                        0: 3,
                        1: 1,
                        2: 3,
                        3: 2,
                        4: 1,
                        5: 1,
                    });

                    s.emit("br", br);

                    // Other box random result
                    EmitExcept(s.id, "obr", { id: s.id, br });

                    setTimeout(() => {
                        cubes[id].available = true;
                        // box availablity
                        EmitAll("ba", { id, av: cubes[id].available });
                    }, 1500);
                }
            });

            // use item
            s.on("ui", (itemCode: number) => {
                // other use item
                EmitAll("ui", { p: s.id, v: itemCode });
                let seconds = 0;
                switch (itemCode) {
                    case 0:
                    case 4:
                        seconds = 5;
                        break;
                }
                // calculate when item expires and everything:
                // stop effect
                if (seconds > 0) {
                    setTimeout(() => {
                        EmitAll("se", { p: s.id, v: itemCode });
                    }, seconds * 1000);
                }
            });

            // apply effect, mostly for stammped | 3
            s.on("ae", (args:{p: string, e:number}) => {
                EmitAll("ae", args);
            });
        }
    );
}
