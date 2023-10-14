import * as THREE from "three";
import { PointerMesh } from "./PointerMesh";

export class Character {
    public pointer: PointerMesh;
    public mesh: THREE.Object3D<THREE.Object3DEventMap>;
    public mousePos: THREE.Vector3;
    public mixer: THREE.AnimationMixer;
    public name: string;
    public update: () => void;
    public props: THREE.Group[];
    constructor(
        name: string,
        mesh: THREE.Object3D<THREE.Object3DEventMap>,
        options?: {
            animation?: THREE.AnimationClip;
        }
    ) {
        this.name = name;
        this.mesh = mesh;
        this.pointer = new PointerMesh(this.mesh);
        this.mousePos = new THREE.Vector3();
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.update = () => {};
        this.props = [];
        if (options) {
            if (options.animation) {
                const anim = this.mixer.clipAction(options.animation);
                anim.setEffectiveTimeScale(0.5);
                anim.play();
                anim.weight = 1;
                anim.time += Math.random() * 10;
            }
        }
    }
    public get position() {
        return this.mesh.position;
    }
}


