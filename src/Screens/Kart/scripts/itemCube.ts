import * as THREE from "three";
import * as CANNON from "cannon-es";
import tweenModule, { Easing } from "three/examples/jsm/libs/tween.module.js";
import { filtersDefenitions as filters } from "../assets/filters";

// https://sole.github.io/tween.js/examples/03_graphs.html
export class ItemCube {
    public mesh: THREE.Mesh;
    public body: CANNON.Body;
    public available: boolean;
    public spin:boolean;
    public static onNew: (x: ItemCube) => void = () => {};

    constructor(mesh: THREE.Mesh, pos: [number, number, number], ava: boolean, onCollide: (event: { body: CANNON.Body | undefined }) => void) {
        this.mesh = mesh.clone();
        this.mesh.position.set(pos[0], pos[1], pos[2]);
        var scale = 1;
        this.mesh.scale.set(scale, scale, scale);

        if (this.mesh.material as THREE.MeshStandardMaterial) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.opacity = 0.2;
            material.transparent = true;
        }
        this.body = new CANNON.Body({
            isTrigger: true,
            collisionFilterGroup: filters.itemBox,
            collisionFilterMask: filters.localCarBody,
        });
        this.body.position = new CANNON.Vec3(pos[0], pos[1], pos[2]);
        this.body.addShape(new CANNON.Box(new CANNON.Vec3(scale, scale, scale)));
        this.available = ava;
        this.mesh.rotation.set(Math.random() * Math.PI,Math.random() * Math.PI,Math.random() * Math.PI)
        this.body.addEventListener("collide", onCollide);
        this.spin= true;
        ItemCube.onNew(this);
    }

    // The f Function is removing the mesh from the  scene
    public disapear(start: () => void, end: () => void) {
        this.spin = false;
        const startScale = this.mesh.scale.clone();
        const startRot = this.mesh.rotation;
        const endScale = new THREE.Vector3(0, 0, 0);
        const endRot = new THREE.Vector3(this.mesh.rotation.x - Math.PI,this.mesh.rotation.y - Math.PI,this.mesh.rotation.z - Math.PI);
        const duration = 400; // Animation duration in milliseconds

        let interval: number;
        start();
        const tween2 = new tweenModule.Tween(startScale)
            .to(endScale, duration)
            .easing(Easing.Back.In)
            .onUpdate((x) => {
                this.mesh.scale.copy(x);
            })
            .onComplete(() => {
                end();
                this.spin = true;
            })
            .start(0);
        const tween1 = new tweenModule.Tween(startRot)
            .to(endRot, duration + 100)
            .easing(Easing.Back.In)
            .onUpdate((x) => {
                this.mesh.rotation.copy(x);
            })
            .onComplete(() => {
                clearInterval(interval);
            })
            .start(0);
        let t = 0;
        interval = setInterval(() => {
            tween2.update(t);
            tween1.update(t);
            t += 16;
        }, 16);
    }
    // The f Function is uploading the mesh back to the scene
    public appear(f: () => void) {
        const startScale = this.mesh.scale.clone();
        const endScale = new THREE.Vector3(1, 1, 1);
        const duration = 500;
        let interval: number;
        f();
        const tween = new tweenModule.Tween(startScale)
            .to(endScale, duration)
            .easing(Easing.Back.Out)
            .onUpdate((x) => {
                this.mesh.scale.copy(x);
            })
            .onComplete((x) => {
                this.mesh.scale.copy(x);
                clearInterval(interval);
            }).onStart(()=>{
                f();
            })            .start(0);
        let t = 0;
        interval = setInterval(() => {
            tween.update(t);
            t += 16;
        }, 16);
    }
}
