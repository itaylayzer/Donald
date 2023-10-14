import * as THREE from "three";

export function findBoneByName(object: THREE.Object3D, boneName: string): THREE.Bone | undefined {
    if (object instanceof THREE.Bone) {
        if (object.name === boneName) {
            return object as THREE.Bone;
        }
    }

    for (const child of object.children) {
        const foundBone = findBoneByName(child, boneName);
        if (foundBone) {
            return foundBone;
        }
    }

    return undefined;
}
