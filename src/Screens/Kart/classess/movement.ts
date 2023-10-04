import * as CANNON from "cannon-es";
import { Player } from "./player";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import tweenModule, { Easing } from "three/examples/jsm/libs/tween.module.js";
import { project } from "../assets/functions";

export class PlayerMovement {
    public player: Player;
    public camera: THREE.Camera;
    public forces: Map<number, CANNON.Vec3>;
    public static deltaTime: number;
    public deltaRotation: number;

    public logFunc: (...what: any[]) => void;
    constructor(p: Player, c: THREE.Camera, log: (...what: any[]) => void) {
        this.player = p;
        // this.forces = new Map();
        this.camera = c;
        this.deltaRotation = this.player.rotation; // for drifting!
        this.forces = new Map();
        this.logFunc = log;
        this.player.onBump = (p) => {
            function bump(mine: Player, other: Player) {
                // calculate the bump forcce
                const vel = mine.body.position.clone().vsub(other.body.position.clone());

                const length = project(other.body.velocity, vel).length();
                return vel.scale(1 / vel.length()).scale(length);
            }

            function fixedBump(mine: Player, other: Player): CANNON.Vec3 {
                const a = bump(mine, other);
                const b = bump(other, mine);

                if (a.length() > b.length()) {
                    // the hitter is other
                    return a;
                }
                if (b.length() > a.length()) {
                    // the hitter is mine
                    return b.scale(-0.33);
                } else return a;
            }

            const myForce = fixedBump(this.player, p);
            this.applyForces(myForce);
        };
    }
    public applyForces(f: CANNON.Vec3) {
        // this.player.body.applyImpulse(f);
        let id = -1;
        const keys = Array.from(this.forces.keys());
        const maxValue = [0, 0, ...keys].reduce((a, b) => Math.max(a, b));
        while (maxValue >= id) {
            id++;
            if (!keys.includes(id)) {
                this.forces.set(id, f.clone());
                break;
            }
        }
        let interval: number;
        const tween = new tweenModule.Tween(f.clone())
            .to(CANNON.Vec3.ZERO, 1000)
            .easing(Easing.Quadratic.In)
            .onUpdate((x) => {
                this.forces.set(id, x.clone());
                // this.logFunc(x.clone().toString());
            })
            .onComplete(() => {
                this.forces.delete(id);
                clearInterval(interval);
            })
            .start(0);

        let t = 0;
        interval = setInterval(() => {
            t += 1000 * PlayerMovement.deltaTime;
            tween.update(t);
        }, 1000 * PlayerMovement.deltaTime);
    }

    public update(dT: number, keysAxis: { vertical: number; horizontal: number }, forwardQuaternion: CANNON.Quaternion) {
        PlayerMovement.deltaTime = dT;
        this.deltaRotation = lerp(this.deltaRotation, this.player.rotation, 0.1);
        this.player.rotation -= keysAxis.horizontal * 2 * keysAxis.vertical * (60 * dT);

        // this.movement(keysAxis.vertical, dT);
        const forwardVector = new CANNON.Vec3(0, 0, 1);
        const carForward = forwardQuaternion.clone().vmult(forwardVector);
        const carVelocity = carForward.scale(
            // 150CC = 30
            // 100CC = 22.5
            // 50CC = 15
            1.5 *
                (Math.abs(keysAxis.vertical) * 15 - Math.abs(keysAxis.horizontal * keysAxis.vertical) * 1.5) *
                (keysAxis.vertical > 0 ? 1 : -0.7) *
                (1 + +(this.player.effect === 1))
        );
        for (const x of Array.from(this.forces.values())) {
            carVelocity.vadd(x, carVelocity);
        }
        carVelocity.vsub(new CANNON.Vec3(this.player.body.velocity.x, 0, this.player.body.velocity.z), carVelocity);
        // for (const _force of Array.from(this.forces.values())) {
        //     console.log("forcee", _force);
        //     summedVelocity.vadd(_force, summedVelocity);
        // }
        this.player.body.velocity.vadd(new CANNON.Vec3(carVelocity.x, 0, carVelocity.z), this.player.body.velocity);
    }
}
