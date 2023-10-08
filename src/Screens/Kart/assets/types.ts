
export interface ItemBox {
    available: boolean;
    pos: [number, number, number];
}
export type IBoxList = {
    [key: string]: ItemBox;
};

export type CustomLight = {
    color: THREE.ColorRepresentation;
    intensity: number;
    pos?: THREE.Vector3;
    rot?: THREE.Euler;
    type: "point" | "directional" | "ambient";
};


export type Item = number | false;

export interface Settings {
    videoScale: number;
    gamepadIndex:number;
    showFps:boolean;
    volumes:[number,number,number];
}
