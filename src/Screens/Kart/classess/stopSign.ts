import * as THREE from "three";
import { QuatToQuaternion, QuaternionToQuat, TWWEENS, Vec3ToVector3, Vector3ToVec3 } from "../assets/functions";
import { Player } from "./player";
import * as CANNON from "cannon-es";
import { filtersDefenitions as filters } from "../assets/inputs";
import { softObj } from "../assets/materials";
export default class StopSign {
    public myPlayer: Player;
    public mesh: THREE.Group<THREE.Object3DEventMap>;
    public body: CANNON.Body;
    constructor(
        xplayer: Player,
        myPlayer: Player,
        mesh: THREE.Group<THREE.Object3DEventMap>,
        add: (m: THREE.Group<THREE.Object3DEventMap>, b: CANNON.Body) => void,
        remove: (m: THREE.Group<THREE.Object3DEventMap>, b: CANNON.Body) => void,
        deltaTime: number
    ) {
        this.mesh = mesh.clone();
        this.myPlayer = myPlayer;
        this.mesh.scale.multiplyScalar(0.007);
        this.mesh.position.copy(Vec3ToVector3(xplayer.body.position.clone().vadd(new CANNON.Vec3(0, 5, 0))));

        const _quaternion = new CANNON.Quaternion();
        _quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), (xplayer.rotation * Math.PI) / 180);

        this.mesh.quaternion.copy(QuatToQuaternion(_quaternion));
        this.body = new CANNON.Body({
            mass: 10,
            shape: new CANNON.Box(new CANNON.Vec3(1, 1, 0.1)),
            position: Vector3ToVec3(this.mesh.position),
            quaternion: QuaternionToQuat(this.mesh.quaternion),
            collisionFilterGroup: filters.stopSign,
            collisionFilterMask: (xplayer.id !== this.myPlayer.id ? filters.localCarBody : 0) | filters.ground,
            material: softObj,
        });

        this.body.addEventListener("collide", (event: { body: CANNON.Body | undefined }) => {
            if (event.body === undefined) return;

            const x = event.body.id;
            if (x === this.myPlayer.carBody.id && xplayer.id !== myPlayer.id) {
                this.body.collisionFilterMask = filters.ground;
                this.myPlayer.stopAtPlace(2);
            }
        });

        add(this.mesh, this.body);

        var lifetime = setInterval(() => {
            this.mesh.position.copy(Vec3ToVector3(this.body.position).add(new THREE.Vector3(0, -1, 0)));
            this.body.quaternion.copy(QuaternionToQuat(this.mesh.quaternion));
        }, deltaTime);

        setTimeout(() => {
            clearInterval(lifetime);
            TWWEENS.deltaTime(deltaTime).stopSign(this, () => {
                remove(this.mesh, this.body);
            });
        }, 5 * 1000);
    }
}
