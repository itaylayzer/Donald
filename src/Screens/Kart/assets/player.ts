import * as THREE from "three";
import * as CANNON from "cannon-es";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export class Player {
    public id: string;
    public body: CANNON.Body;
    public carBody: CANNON.Body;
    public mesh: THREE.Group;
    public mixer: THREE.AnimationMixer;
    public static onNew: (x: Player) => void = () => {};
    public static carMesh: { player: THREE.Group; car: THREE.Group };
    constructor(id: string, ifLocal?: boolean) {
        const material = new THREE.MeshStandardMaterial({ color: "red" });
        const car = Player.carMesh.car.clone();
        car.scale.multiplyScalar(0.005);

        const player = SkeletonUtils.clone(Player.carMesh.player);
        player.scale.multiplyScalar(0.005);

        const newGroup = new THREE.Group();

        newGroup.add(player);
        newGroup.add(car);

        this.mesh = newGroup;
        this.mesh.scale.multiplyScalar(1);
        this.mixer = new THREE.AnimationMixer(this.mesh);

        this.carBody = new CANNON.Body({
            position: new CANNON.Vec3(0, 5, 0),
            collisionFilterGroup: ifLocal ? 8 : 2,
            // isTrigger:true,
            collisionFilterMask: 1 | 4,
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(0.4, 1, 1)),
        });

        if (ifLocal !== undefined && ifLocal === true) {
            this.body = new CANNON.Body({
                mass: 1,
                shape: new CANNON.Sphere(0.5),
                position: new CANNON.Vec3(0, 5, 0),
                collisionFilterGroup: 1,
                collisionFilterMask: 1 | 2,
            });
        } else {
            this.body =
                this.carBody ??
                new CANNON.Body({
                    position: new CANNON.Vec3(0, 5, 0),
                    collisionFilterGroup: 2,
                    collisionFilterMask: 1 | 4,
                    mass: 1,
                    shape: new CANNON.Box(new CANNON.Vec3(0.4, 1, 1)),
                });
        }

        this.id = id;
        Player.onNew?.(this);
    }
}
