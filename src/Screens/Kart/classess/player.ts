import * as THREE from "three";
import * as CANNON from "cannon-es";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { filtersDefenitions as filters } from "../assets/inputs";
import { Item } from "../assets/types";
import { TWWEENS } from "../assets/functions";

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
    constructor(id: string, ifLocal?: boolean, emitApplyEffect?: (p: string) => void) {
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

        this.mesh = newGroup;
        this.mesh.scale.multiplyScalar(1);
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.rotation = 180;
        this.moveable = true;
        this.rounds = 0;
        this.carBody = new CANNON.Body({
            position: new CANNON.Vec3(0, 5, 0),
            collisionFilterGroup: ifLocal ? filters.localCarBody : filters.carBody,
            // isTrigger:true,
            collisionFilterMask: ifLocal
                ? filters.stopSign | filters.ground | filters.itemBox | filters.wheel
                : filters.ground | filters.itemBox | filters.localPlayerBody | filters.wheel,
            mass: ifLocal ? 1 : 0,
            shape: new CANNON.Box(new CANNON.Vec3(0.4, 1, 1)),
        });

        if (ifLocal !== undefined && ifLocal === true) {
            this.body = new CANNON.Body({
                mass: 1,
                shape: new CANNON.Sphere(0.5),
                position: new CANNON.Vec3(0, 5, 0),
                collisionFilterGroup: filters.localPlayerBody,
                collisionFilterMask: filters.ground | filters.carBody,
            });

            this.body.addEventListener("collide", (event: { body: CANNON.Body | undefined }) => {
                if (event.body === undefined) return;
                if (this.effect !== 2) return;
                const obj = Object.fromEntries(
                    Array.from(Player.clients.values()).map((v) => {
                        return [v.body.id.toString(), v];
                    })
                );
                const x = event.body.id.toString();
                if (Object.keys(obj).includes(x)) {
                    const player = obj[x];
                    if (player.effect === 0)
                    emitApplyEffect?.(player.id);
                }
            });
        } else {
            this.body =
                this.carBody ??
                new CANNON.Body({
                    position: new CANNON.Vec3(0, 5, 0),
                    collisionFilterGroup: filters.carBody,
                    collisionFilterMask: filters.ground | filters.itemBox | filters.localPlayerBody,
                    mass: 1,
                    shape: new CANNON.Box(new CANNON.Vec3(0.4, 1, 1)),
                });
        }
        this.item = false;
        this.id = id;
        this.effect = 0;
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
    public StampedToTheGround(durationInSeconds: number = 2) {
        this.stopAtPlace(durationInSeconds);
        TWWEENS.deltaTime(1 / Player.fps).playerScale(this, new THREE.Vector3(1, 0.1, 1), 300);

        this.body.collisionFilterMask = filters.ground | filters.itemBox;
        setTimeout(() => {
            TWWEENS.deltaTime(1 / Player.fps).playerScale(this, 1, 300);
            this.body.collisionFilterMask = filters.ground | filters.itemBox | filters.wheel | (this.islocal ? filters.localPlayerBody : 0);
        }, durationInSeconds * 1000);
    }
}
