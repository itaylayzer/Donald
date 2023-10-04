import * as THREE from "three";
import * as CANNON from "cannon-es";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { filtersDefenitions as filters } from "../assets/inputs";
import { Item } from "../assets/types";
import { TWWEENS } from "../assets/functions";
import { carMaterial, playerMaterial } from "../assets/materials";

export class Player {
    public id: string;
    public body: CANNON.Body;
    public carBody: CANNON.Body;
    public mesh: THREE.Group;
    public mixer: THREE.AnimationMixer;
    public static fps: number;
    public static onNew: (x: Player) => void = () => {};
    public static carMesh: { player: THREE.Group; car: THREE.Group };
    public static clients: Map<string, Player>;
    public item: Item;
    public effect: number;
    public rotation: number;
    public rounds: number;
    public islocal: boolean;
    // localPlayer vari
    public moveable: boolean;
    public spinning: boolean;
    public position: number;
    public roundable: boolean;
    public onBump: undefined | ((p: Player) => void);
    constructor(id: string, ifLocal?: boolean, options?: { effect: (p: string) => void }) {
        this.position = 0;
        this.item = false;
        this.id = id;
        this.effect = 0;

        this.rotation = 180;
        this.moveable = true;
        this.spinning = false;
        this.roundable = false;
        this.rounds = 0;

        const material = new THREE.MeshStandardMaterial({ color: "red" });
        const car = Player.carMesh.car.clone();
        car.scale.multiplyScalar(0.005);
        const player = SkeletonUtils.clone(Player.carMesh.player);
        player.scale.multiplyScalar(0.005);

        if (ifLocal !== undefined && ifLocal === true) {
            (car.children[0] as THREE.Mesh).material = material;
            (player.children[0] as THREE.Mesh).material = material;
        }

        const newGroup = new THREE.Group();
        this.islocal = ifLocal === true;
        newGroup.add(player);
        newGroup.add(car);

        this.onBump = undefined;
        this.mesh = newGroup;
        this.mesh.scale.multiplyScalar(1);
        this.mixer = new THREE.AnimationMixer(this.mesh);

        this.carBody = new CANNON.Body({
            position: new CANNON.Vec3(0, 5, 0),
            collisionFilterGroup: ifLocal ? filters.localCarBody : filters.carBody,
            // isTrigger:true,
            collisionFilterMask: ifLocal
                ? filters.stopSign | filters.ground | filters.itemBox | filters.wheel | filters.carBody
                : filters.ground | filters.itemBox | filters.localCarBody | filters.localPlayerBody | filters.wheel | filters.carBody,
            mass: ifLocal ? 1 : 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.4, 1, 1)),
            material: carMaterial,
            fixedRotation: true,
        });

        if (ifLocal !== undefined && ifLocal === true) {
            this.body = new CANNON.Body({
                mass: 1,
                shape: new CANNON.Sphere(0.5),
                position: new CANNON.Vec3(0, 5, 0),
                collisionFilterGroup: filters.localPlayerBody,
                collisionFilterMask: filters.ground | filters.carBody,
                material: playerMaterial,
            });

            this.body.addEventListener("collide", (event: { body: CANNON.Body | undefined }) => {
                if (event.body === undefined) return;
                const obj = Object.fromEntries(
                    Array.from(Player.clients.values()).map((v) => {
                        return [v.body.id.toString(), v];
                    })
                );
                const x = event.body.id.toString();
                if (Object.keys(obj).includes(x)) {
                    const player = obj[x];
                    if (player.effect === 0 && this.effect === 2) {
                        options?.effect(player.id);
                    } else {
                        this.onBump?.(player);
                        // options?.velocity(player.id, this.body.velocity.clone());
                    }
                }
            });
        } else {
            this.body = this.carBody;
        }

        Player.onNew?.(this);
    }
    public stopAtPlace(durationInSeconds: number) {
        const positions = this.body.position;
        this.moveable = false;
        let interval = setInterval(() => {
            this.body.position.copy(positions);
            this.body.velocity.copy(new CANNON.Vec3(0, 0, 0));
        }, 1000 / Player.fps);
        setTimeout(() => {
            this.moveable = true;
            clearInterval(interval);
        }, durationInSeconds * 1000);
    }
    public stampedToTheGround(durationInSeconds: number = 2) {
        const _filters = this.body.collisionFilterMask;
        this.stopAtPlace(durationInSeconds);
        TWWEENS.deltaTime(1 / Player.fps).playerScale(this, new THREE.Vector3(1, 0.1, 1), 300);

        this.body.collisionFilterMask = filters.ground | filters.itemBox;
        setTimeout(() => {
            TWWEENS.deltaTime(1 / Player.fps).playerScale(this, 1, 300);
            this.body.collisionFilterMask = _filters;
            console.log(this.body.collisionFilterMask);
        }, durationInSeconds * 1000);
    }

    public setPos(v: number, maxPosition: number) {
        if (v === this.position + 1 || (v === 0 && this.position === maxPosition)) {
            // always validates THE POSITION!
            this.position = v;
            if ((v = 80)) {
                this.roundable = true;
            }
        }
    }

    public spinAtPlace(durationInSeconds: number = 2) {
        this.spinning = true;
        const _filters = this.body.collisionFilterMask;
        this.stopAtPlace(durationInSeconds);
        TWWEENS.deltaTime(1 / Player.fps).playerRotation(this, this.rotation + 360 * 3, durationInSeconds * 1000 - 100);

        this.body.collisionFilterMask = filters.ground | filters.itemBox;
        setTimeout(() => {
            this.body.collisionFilterMask = _filters;
            console.log(this.body.collisionFilterMask);
            this.spinning = false;
        }, durationInSeconds * 1000);
    }
}
