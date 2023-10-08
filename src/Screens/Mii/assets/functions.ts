import * as THREE from "three";

export function findBoneByName(object: THREE.Object3D, boneName: string): THREE.Bone | undefined {
    if (object instanceof THREE.Bone) {
        // Check if the current object is a bone and has the specified name
        if (object.name === boneName) {
            return object as THREE.Bone;
        }
    }

    // Recursively search through the children of the object
    for (const child of object.children) {
        const foundBone = findBoneByName(child, boneName);
        if (foundBone) {
            return foundBone;
        }
    }

    // If not found, return undefined
    return undefined;
}
