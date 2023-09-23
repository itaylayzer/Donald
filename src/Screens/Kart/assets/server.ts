import { IBoxList } from "./types";
import { Server, Socket } from "./websockets";


export default function main(finished: (host: string) => void) {
    const clients = new Map<string, Socket>();
    const cubes = {
        '0':{
            available:true,
            pos:[-6,1, 3]
        },
        '1':{
            available:true,
            pos:[-3,1, 3]
        },
        '2':{
            available:true,
            pos:[0,1, 3]
        },
        '3':{
            available:true,
            pos:[3,1, 3]
        },
        '4':{
            available:true,
            pos:[6,1, 3]
        },

    } as IBoxList;
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
                s.emit("i", {p:Array.from(clients.keys()),c:cubes});
                EmitAll("n-p", s.id);
                clients.set(s.id, s);
            });
            // movements
            s.on("m", (args: { pos: [number, number, number]; rot: number }) => {
                EmitExcept(s.id, "m", { ...args, id: s.id });
            });
            s.on('disconnect',()=>{
                EmitExcept(s.id, "p-dis",s.id);
                clients.delete(s.id)
            })
            s.on("b",(id:string)=>{
                if (Object.keys(cubes).includes(id)){
                    cubes[id].available = false;
                    EmitAll("ba",{id, av:cubes[id].available});
                    s.emit("br",)
                    setTimeout(()=>{
                        cubes[id].available = true;
                        EmitAll("ba",{id, av:cubes[id].available});
                    }, 1500)
                }
                
            })
        }
    );
}
