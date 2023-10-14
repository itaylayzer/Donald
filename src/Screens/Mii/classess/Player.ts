import { lerp } from "three/src/math/MathUtils.js";
import { Character } from "./Character";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { QuatToQuaternion, Vec3ToVector3 } from "../../Kart/assets/functions";
export class Player {
    public keysAxisRaw: { horizontal: number; vertical: number };
    public keysAxis: { horizontal: number; vertical: number };
    public char: Character;
    public yRotation: number;
    public yMovement: number;
    public spherical: THREE.Spherical;
    public static animationsPack: { idle: THREE.AnimationClip; walking: THREE.AnimationClip; running: THREE.AnimationClip };
    public animations: { idle: THREE.AnimationAction; walking: THREE.AnimationAction; running: THREE.AnimationAction };
    public animweights: { idle: number; walking: number; running: number };
    public running: boolean;
    public runningLerped:number;
    public lastLook: number;
    constructor(c: Character) {
        this.char = c;
        this.keysAxisRaw = { horizontal: 0, vertical: 0 };
        this.keysAxis = { horizontal: 0, vertical: 0 };
        this.yRotation = 0;
        this.yMovement = 0;
        this.lastLook = 0;
        this.runningLerped = 0;
        this.spherical = new THREE.Spherical(6, Math.PI, 0);

        
        this.running = false;
        this.animations = {
            idle: this.char.mixer.clipAction(Player.animationsPack.idle),
            walking: this.char.mixer.clipAction(Player.animationsPack.walking),
            running: this.char.mixer.clipAction(Player.animationsPack.running),
        };
        this.animweights = {
            idle: 0,
            walking: 0,
            running: 0,
        };
        this.animations.walking.weight = 0;
        this.animations.idle.weight = 0;
        this.animations.running.weight = 0;
        this.animations.walking.setEffectiveTimeScale(1.2);
        this.animations.walking.play();
        this.animations.idle.play();
        this.animations.running.play();
        this.animations.running.setEffectiveTimeScale(1.2);
    }
    public mouseMovement(movementX:number){
        this.yMovement = -movementX * 2 / 10;
    }
    public update(deltaTime: number, camera: THREE.PerspectiveCamera, keysDown: Set<string>) {
        function _keys(this: Player) {
            this.running = keysDown.has("ShiftLeft");
            this.runningLerped = lerp(this.runningLerped, this.running ? 1 : 0, deltaTime * 5);
            this.keysAxisRaw.vertical = keysDown.has("KeyW") && keysDown.has("KeyS") ? 0 : keysDown.has("KeyW") ? 1 : keysDown.has("KeyS") ? -1 : 0;
            this.keysAxisRaw.horizontal = keysDown.has("KeyD") && keysDown.has("KeyA") ? 0 : keysDown.has("KeyD") ? 1 : keysDown.has("KeyA") ? -1 : 0;
            for (const key in Object.keys(this.keysAxis)) {
                const k = Object.keys(this.keysAxis)[key] as "horizontal" | "vertical";
                this.keysAxis[k] = lerp(this.keysAxis[k], this.keysAxisRaw[k], 0.1);
            }
        }

        function calculateAngle(keysAxis: { horizontal: number; vertical: number }): number {
            const { horizontal, vertical } = keysAxis;
            const radians = Math.atan2(-horizontal, vertical);
            const maxDegree = 2 * Math.PI;
            return (radians + maxDegree) % maxDegree;
        }

        function _movement(this: Player) {
            const forwardQuaternion = new CANNON.Quaternion();
            forwardQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.yRotation * THREE.MathUtils.DEG2RAD);

            const forward = Vec3ToVector3(forwardQuaternion.clone().vmult(new CANNON.Vec3(0, 0, 1)));
            const right = Vec3ToVector3(forwardQuaternion.clone().vmult(new CANNON.Vec3(1, 0, 0)));

            this.char.mesh.position.add(
                forward
                    .clone()
                    .multiplyScalar(this.keysAxis.vertical)
                    .add(right.clone().multiplyScalar(-this.keysAxis.horizontal))
                    .multiplyScalar(deltaTime * 3 * (Math.max(5 * this.runningLerped,1)))
            );

            if (Math.max(Math.min(Math.abs(this.keysAxisRaw.horizontal) + Math.abs(this.keysAxisRaw.vertical), 1), 0) === 1) {
                this.lastLook = this.yRotation;
            }

            forwardQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.lastLook * THREE.MathUtils.DEG2RAD + calculateAngle(this.keysAxis));
            this.char.mesh.quaternion.slerp(QuatToQuaternion(forwardQuaternion), deltaTime * 5);
        }
        function _camera(this: Player) {
            this.spherical.phi = (Math.PI * 0.6) / 2;
            this.spherical.theta = this.yRotation * THREE.MathUtils.DEG2RAD+ Math.PI;

            camera.position.setFromSpherical(this.spherical).add(this.char.mesh.position);
            camera.lookAt(this.char.mesh.position);
            camera.position.add(new THREE.Vector3(0, 1, 0));
        }
        function _animation(this: Player) {
            let A = Math.max(Math.min(Math.abs(this.keysAxisRaw.horizontal) + Math.abs(this.keysAxisRaw.vertical), 1), 0);
            let B = this.running ? A : 0;

            this.animweights.running = lerp(this.animweights.running, B*3, deltaTime * 5);
            this.animweights.walking = lerp(this.animweights.walking, Math.abs(B - A) * 3, deltaTime * 5);
            this.animweights.idle = lerp(this.animweights.idle, (1 - A)*3, deltaTime * 5);

            this.animations.running.setEffectiveWeight(this.animweights.running);
            this.animations.idle.setEffectiveWeight(this.animweights.idle);
            this.animations.walking.setEffectiveWeight(this.animweights.walking);
        }
        _keys.bind(this)();
        _movement.bind(this)();
        _camera.bind(this)();
        _animation.bind(this)();

        this.yRotation += this.yMovement;
        this.yRotation = (this.yRotation + 360) % (360);
        this.yMovement = 0;
    }
    public destroy(){
        this.animations.walking.stop();
        this.animations.idle.stop();
        this.animations.running.stop();
    }
}
