import { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ItemCube } from "../scripts/itemCube";
export interface ItemBox {
    available:boolean,
    pos:[number,number, number]
};
export type IBoxList = {
    [key:string]:ItemBox
}

export type CustomLight = {
    color:THREE.ColorRepresentation,
    intensity:number,
    pos?:THREE.Vector3,
    rot?:THREE.Euler
    type:"point"|"directional"|"ambient"
}

export type loadedMesh = {
    gltf: { [key: string]: GLTF };
    fbx: { [key: string]: THREE.Group };
}