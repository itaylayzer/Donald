import * as THREE from "three";
import * as CANNON from "cannon-es";

export function cubicBezier(p0: number, p1: number, p2: number, p3: number) {
    return (t: number) => {
        const t1 = 1 - t;
        return t1 * t1 * t1 * p0 + 3 * t1 * t1 * t * p1 + 3 * t1 * t * t * p2 + t * t * t * p3;
    };
}

export function Vector3ToVec3(v: THREE.Vector3): CANNON.Vec3 {
    return new CANNON.Vec3(v.x, v.y, v.z);
}
export function Vec3ToVector3(v: CANNON.Vec3): THREE.Vector3 {
    return new THREE.Vector3(v.x, v.y, v.z);
}
export function QuaternionToQuat(v: THREE.Quaternion): CANNON.Quaternion {
    return new CANNON.Quaternion(v.x, v.y, v.z, v.w);
}
export function QuatToQuaternion(v: CANNON.Quaternion): THREE.Quaternion {
    return new THREE.Quaternion(v.x, v.y, v.z, v.w);
}
export function RotToQuat(e:THREE.Euler) {
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromEuler(e.x, e.y, e.z);
    return quaternion;
}

export function calculateRotationMatrix(roll: number, pitch: number, yaw: number): number[][] {
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    const rotationMatrix: number[][] = [
        [cosY * cosP, cosY * sinP * sinR - sinY * cosR, cosY * sinP * cosR + sinY * sinR],
        [sinY * cosP, sinY * sinP * sinR + cosY * cosR, sinY * sinP * cosR - cosY * sinR],
        [-sinP, cosP * sinR, cosP * cosR],
    ];

    return rotationMatrix;
}