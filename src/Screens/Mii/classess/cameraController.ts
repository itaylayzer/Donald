import { QuaternionToQuat, Vec3ToVector3 } from "#Donald/Screens/Kart/assets/functions";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import * as CANNON from "cannon-es";
export class CameraControl {
    public keysAxisRaw: { horizontal: number; vertical: number; up: number };
    public keysAxis: { horizontal: number; vertical: number; up: number };
    public camera: THREE.PerspectiveCamera;
    public rotation: THREE.Vector2;
    public rotMovement: THREE.Vector2;
    public _position: THREE.Vector3;
    public down: boolean;
    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.keysAxisRaw = { horizontal: 0, vertical: 0, up: 0 };
        this.keysAxis = { horizontal: 0, vertical: 0, up: 0 };
        this.rotation = new THREE.Vector2();
        this.rotMovement = new THREE.Vector2();
        this._position = new THREE.Vector3(0, 9, 9);
        this.down = false;
    }
    public update(deltaTime: number, pos: THREE.Vector3 | undefined, keysDown: Set<string>) {
        const cameraRotation = new THREE.Euler();

        function _keys(this: CameraControl) {
            this.keysAxisRaw.vertical = this.down
                ? keysDown.has("KeyW") && keysDown.has("KeyS")
                    ? 0
                    : keysDown.has("KeyW")
                    ? 1
                    : keysDown.has("KeyS")
                    ? -1
                    : 0
                : 0;
            this.keysAxisRaw.horizontal = this.down
                ? keysDown.has("KeyD") && keysDown.has("KeyA")
                    ? 0
                    : keysDown.has("KeyD")
                    ? 1
                    : keysDown.has("KeyA")
                    ? -1
                    : 0
                : 0;
            this.keysAxisRaw.up = keysDown.has("KeyQ") && keysDown.has("KeyE") ? 0 : keysDown.has("KeyQ") ? -1 : keysDown.has("KeyE") ? 1 : 0;
            for (const key in Object.keys(this.keysAxis)) {
                const k = Object.keys(this.keysAxis)[key] as "horizontal" | "vertical" | "up";
                this.keysAxis[k] = lerp(this.keysAxis[k], this.keysAxisRaw[k], 0.1);
            }
        }
        _keys.bind(this)();
        if (pos) {
            cameraRotation.x = -0.3;
            cameraRotation.z = 0;
            cameraRotation.y = 0;
            this._position.lerp(pos.add(new THREE.Vector3(0, 3, 3)), deltaTime * 5);
            this.camera.quaternion.copy(new THREE.Quaternion().setFromEuler(cameraRotation));
        } else {
            this.camera.quaternion.setFromEuler(new THREE.Euler(this.rotation.y * THREE.MathUtils.DEG2RAD, 0, 0));
            const cameraUp = new THREE.Vector3(0, 1, 0); //.applyQuaternion(this.camera.quaternion);
            this.camera.rotateOnWorldAxis(cameraUp, this.rotation.x * THREE.MathUtils.DEG2RAD);
            cameraRotation.setFromQuaternion(this.camera.quaternion);
            const forwardQuaternion = QuaternionToQuat(this.camera.quaternion);
            const forwardVector = Vec3ToVector3(forwardQuaternion.vmult(new CANNON.Vec3(0, 0, 1)).scale(-this.keysAxis.vertical));
            const rightVector = Vec3ToVector3(forwardQuaternion.vmult(new CANNON.Vec3(1, 0, 0)).scale(this.keysAxis.horizontal));
            this._position.add(
                forwardVector
                    .add(rightVector)
                    .add(new THREE.Vector3(0, this.keysAxis.up * 0.5, 0))
                    .multiplyScalar(deltaTime * 20)
            );
            cameraRotation.x -= this.keysAxis.vertical * 0.05;
            cameraRotation.z -= this.keysAxis.horizontal * 0.05;

            this.camera.quaternion.copy(new THREE.Quaternion().setFromEuler(cameraRotation));
        }

        this.camera.position.lerp(this._position, deltaTime * 5);

        this.rotation.add(this.rotMovement);
        this.rotation.y = Math.max(Math.min(this.rotation.y, 90), -90);
        this.rotMovement.set(0, 0);
    }
    public mouseMovement(movementX: number, movementY: number) {
        if (this.down) this.rotMovement.set(movementX, movementY).multiplyScalar(-1 / 10);
    }
}
