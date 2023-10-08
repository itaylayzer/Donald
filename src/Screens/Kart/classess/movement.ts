import * as CANNON from "cannon-es";
import { Player } from "./player";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils.js";
import tweenModule, { Easing } from "three/examples/jsm/libs/tween.module.js";
import { project } from "../assets/functions";
import { PredictedMovement } from "./predicted";

export class PlayerMovement {
    public player: Player;
    public camera: THREE.Camera;
    public forces: Map<number, CANNON.Vec3>;
    public unaviableIds:Set<string>;
    public static deltaTime: number;
    public driftRot: number;
    public rotation: number;
    public logFunc: (...what: any[]) => void;
    constructor(p: Player, c: THREE.Camera, log: (...what: any[]) => void) {
        this.player = p;
        this.unaviableIds = new Set();
        // this.forces = new Map();
        this.camera = c;
        this.forces = new Map();
        this.logFunc = log;
        this.driftRot = 0;
        this.rotation = p.rotation;
        this.player.onBump = (p) => {
            if (this.unaviableIds.has(p.id)) return;
            function bump(mine: Player, other: Player) {
                // calculate the bump forcce
                const vel = mine.body.position.clone().vsub(other.body.position.clone());

                const length = project(other.body.velocity, vel).length();
                return vel.scale(1 / vel.length()).scale(length);
            }

            function fixedBump(mine: Player, other: Player): { mine: CANNON.Vec3; other: CANNON.Vec3 } {
                const a = bump(mine, other);
                const b = bump(other, mine);

                if (a.length() > b.length()) {
                    // the hitter is other

                    return { mine: a.clone(), other: a.clone().scale(-0.33) };
                }
                if (b.length() > a.length()) {
                    // the hitter is mine
                    return { mine: b.clone().scale(-0.33), other: b.clone() };
                } else return { mine: a.clone(), other: a.clone() };
            }
            this.unaviableIds.add(p.id);
            
            const forces = fixedBump(this.player, p);
            this.applyForces(forces.mine);
            const xpredicted = PredictedMovement.list.get(p.id);
            if (xpredicted) {
                xpredicted.applyForces(forces.other);
            }

            setTimeout(()=>{
                this.unaviableIds.delete(p.id);
            },200)
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
    public update(dT: number, keysAxis: { vertical: number; horizontal: number; drift: boolean }) {
        PlayerMovement.deltaTime = dT;

        if (keysAxis.drift) {
            this.driftRot = lerp(this.driftRot, keysAxis.horizontal * 4 * keysAxis.vertical * (60 * dT), dT);

            this.rotation -= this.driftRot; //* Math.min(Math.max(this.player.body.velocity.clone().length(),0),1);
            this.player.rotation = this.rotation % 360;
            if (this.player.rotation < 0) this.player.rotation += 360;
        } else {
            this.driftRot = 0;
            this.rotation -= keysAxis.horizontal * 2 * keysAxis.vertical * (60 * dT);
            // this.player.rotation -= ;
            this.player.rotation = this.rotation % 360;
            if (this.player.rotation < 0) this.player.rotation += 360;
        }

        const forwardQuaternion = new CANNON.Quaternion();
        forwardQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.player.rotation * THREE.MathUtils.DEG2RAD);

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
