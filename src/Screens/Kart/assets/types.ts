import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
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

export type loadedAssets = {
    gltf: { [key: string]: GLTF };
    fbx: { [key: string]: THREE.Group };
    textures: { [key: string]: THREE.Texture };
};

export type Item = number | false;

export interface Settings {
    videoScale: number;
    fpsCap: number;
    gamepadIndex:number;
    showFps:boolean;
}
