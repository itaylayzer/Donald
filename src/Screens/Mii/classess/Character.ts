import * as THREE from "three";
import { PointerMesh } from "./PointerMesh";
import { CookieCharacter } from "../assets/types";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";

export class Character {
    public pointer: PointerMesh;
    public mesh: THREE.Object3D<THREE.Object3DEventMap>;
    public mousePos: THREE.Vector3;
    public mixer: THREE.AnimationMixer;
    public name: string;
    public update: (() => void)[];
    public props: THREE.Group[];
    public startedAnimation: undefined | THREE.AnimationClip;
    public properties: CookieCharacter | undefined;
    public textMesh: THREE.Mesh;
    public static font:Font;
    public static add:(x:THREE.Object3D)=>void;
    public static remove:(x:THREE.Object3D)=>void;
    public static camera:THREE.Camera;
    constructor(
        name: string,
        mesh: THREE.Object3D<THREE.Object3DEventMap>,
        options?: {
            animation?: THREE.AnimationClip;
        },
    ) {
        this.name = name;

        this.mesh = mesh;
        this.mesh.castShadow = true;
        this.mesh.traverse((v) => {
            if (v.isObject3D) {
                v.castShadow = true;
            }
        });

        this.pointer = new PointerMesh(this.mesh);
        this.mousePos = new THREE.Vector3();
        this.mixer = new THREE.AnimationMixer(this.mesh);

        this.props = [];
        this.startedAnimation = options?.animation ?? undefined;
        this.properties = undefined;
        if (options) {
            if (options.animation) {
                const anim = this.mixer.clipAction(options.animation);
                anim.setEffectiveTimeScale(0.5);
                anim.play();
                anim.weight = 1;
                anim.time += Math.random() * 10;
            }
        }

        this.textMesh = new THREE.Mesh(
            new TextGeometry(this.name, {
               font:Character.font,
               size: 30,
               height:5,

               
            }), new THREE.MeshStandardMaterial({color:"white"})
        );
        this.text(true);
        this.update = [
            () => {
                this.textMesh.position.copy(this.mesh.position).add(new THREE.Vector3((-this.name.length / 8) * Math.acos(this.textMesh.quaternion.y), 4.2, 0));
                console.log(Math.asin(this.textMesh.quaternion.y));
                this.textMesh.lookAt(Character.camera.position);
            },
        ];
    }
    public get position() {
        return this.mesh.position;
    }
    public clone(): Character {
        const newChar = new Character(this.name, clone(this.mesh), {
            animation: this.startedAnimation,
        });
        newChar.properties = this.properties;
        return newChar;
    }
    public text(b:boolean){
        if (b){
            // Character.add(this.textMesh);
            Character.remove(this.textMesh);
        }
        else {
            Character.remove(this.textMesh);
        }
    }
}
