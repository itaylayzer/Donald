import tweenModule, { Easing } from "three/examples/jsm/libs/tween.module.js";
import { QuatToQuaternion } from "../assets/functions";
import { PlayerMovement } from "./movement";
import { Player } from "./player";
import * as CANNON from "cannon-es";
import * as THREE from "three";
export class PredictedMovement {
    public player: Player;
    public forces: Map<number, CANNON.Vec3>;
    // internet
    public pos: CANNON.Vec3;
    public rot:number;
    public side:number;
    public vel:CANNON.Vec3;
    public static list: Map<string, PredictedMovement> = new Map();
    constructor(p: Player) {
        this.player = p;
        this.forces = new Map();
        this.pos = new  CANNON.Vec3();
        this.rot = 0;
        this.side = 0;
        this.vel = new CANNON.Vec3();
        PredictedMovement.list.set(this.player.id, this);
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
    public internetUpdate(args: { pos: [number, number, number]; rot: number; side: number; vel: [number, number, number] }) {
        // this.pos.set(args.pos[0], args.pos[1], args.pos[2])
        // this.player.body.position;
        // const _quaternion = new CANNON.Quaternion();
        // _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), args.rot * THREE.MathUtils.DEG2RAD);
        // this.player.mesh.position.set(args.pos[0], args.pos[1] - 0.2, args.pos[2]);
        // this.player.mesh.quaternion.copy(QuatToQuaternion(_quaternion));
        // this.player.mesh.rotateZ((args.side * 3.14) / 15);
        // this.player.body.mass = 10;
        // this.player.rotation = args.rot;

        // const internetVel = new CANNON.Vec3(args.vel[0], 0, args.vel[2]);
        // const localVel = new CANNON.Vec3(0, 0, 0);
        // for (const x of Array.from(this.forces.values())) {
        //     localVel.vadd(x, localVel);
        // }

        // if (localVel.length() > internetVel.length()) {
        //     this.player.body.velocity.copy(localVel);
        // } else this.player.body.velocity.copy(internetVel);
        // if (this.player.carBody) {
        //     this.player.carBody.position.set(args.pos[0], args.pos[1], args.pos[2]);
        //     this.player.carBody.quaternion.copy(_quaternion);
        //     this.player.carBody.angularDamping = 1;
        //     this.player.carBody.initAngularVelocity.scale(0, this.player.carBody.initAngularVelocity);
        //     this.player.carBody.angularVelocity.scale(0, this.player.carBody.angularVelocity);
        // }
        this.pos.set(args.pos[0], args.pos[1], args.pos[2])
        this.rot = args.rot;
        this.side = args.side;
        this.vel.set(args.vel[0], 0, args.vel[2]);
        
    }
    public localUpdate() {
        const _quaternion = new CANNON.Quaternion();
        _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.rot * THREE.MathUtils.DEG2RAD);
        
        // Body
        this.player.body.mass = 10;
        this.player.body.position.lerp(this.pos,PlayerMovement.deltaTime * 10,this.player.body.position)
        // Mesh
        this.player.mesh.position.set(this.player.body.position.x, this.player.body.position.y - 0.2, this.player.body.position.z);
        this.player.mesh.quaternion.copy(QuatToQuaternion(_quaternion));
        this.player.mesh.rotateZ((this.side * 3.14) / 15);
        
        this.player.rotation = this.rot;

        const localVel = new CANNON.Vec3(0, 0, 0);
        for (const x of Array.from(this.forces.values())) {
            localVel.vadd(x, localVel);
        }

        if (localVel.length() > this.vel.length()) {
            this.player.body.velocity.copy(localVel);
            this.player.body.position.vadd(localVel.scale(PlayerMovement.deltaTime),this.player.body.position);
        } else {
            this.player.body.velocity.copy(this.vel);
            this.player.body.position.vadd(this.vel.scale(PlayerMovement.deltaTime),this.player.body.position);
        }
        if (this.player.carBody) {
            this.player.carBody.angularDamping = 1;
            this.player.carBody.initAngularVelocity.scale(0, this.player.carBody.initAngularVelocity);
            this.player.carBody.angularVelocity.scale(0, this.player.carBody.angularVelocity);
        }
    }
}
