import * as THREE from "three";
import { PointerMesh } from "./PointerMesh";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { CookieCharacter } from "../assets/types";
import { findBoneByName } from "../assets/functions";

export class CharactersList {
    public staticMesh: THREE.Object3D<THREE.Object3DEventMap>;
    public list: Map<string, Character>;
    private _add: (c: Character) => void;
    // @ts-ignore
    private _remove: (c: Character) => void;
    private _addProp: (p: THREE.Group<THREE.Object3DEventMap>) => void;
    public starterAnimation: undefined | THREE.AnimationClip;
    constructor(
        mesh: THREE.Group<THREE.Object3DEventMap>,
        args: {
            add: (c: Character) => void;
            remove: (c: Character) => void;
            addProp: (p: THREE.Group<THREE.Object3DEventMap>) => void;
            animation?: THREE.AnimationClip;
        }
    ) {
        this.staticMesh = clone(mesh);
        this.list = new Map();
        this._add = args.add;
        this._remove = args.remove;
        this._addProp = args.addProp;
        this.starterAnimation = args.animation ?? undefined;
    }

    public get(name: string) {
        return this.list.get(name);
    }

    public get count() {
        return this.list.size;
    }

    public copy() {
        return this;
    }

    public async add(name: string, properties?: CookieCharacter) {
        const xchar = new Character(name, clone(this.staticMesh), {
            animation: this.starterAnimation,
        });

        if (properties) {
            const result = await ComplexMesh.load(xchar.mesh, properties);
            xchar.update = result.update;
            for (const x of result.meshes) {
                this._addProp(x);
            }
        }

        this._add(xchar);
        this.list.set(name, xchar);

        return xchar;
    }

    public remove(name: string) {
        this.list.delete(name);
    }

    public get avg(): { pos: THREE.Vector3 } {
        const p = new THREE.Vector3();
        for (const xp of this.list.values()) {
            p.add(xp.mesh.position);
        }
        return { pos: p.multiplyScalar(1 / this.count) };
    }
    public has(name: string) {
        return this.list.has(name);
    }
    public getForced(name: string): Character {
        const xchar = this.list.get(name);
        if (xchar === undefined) {
            throw new Error("");
        }
        return xchar;
    }
}
export class Character {
    public pointer: PointerMesh;
    public mesh: THREE.Object3D<THREE.Object3DEventMap>;
    public mousePos: THREE.Vector3;
    public mixer: THREE.AnimationMixer;
    public name: string;
    public update: () => void;
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

        if (options) {
            if (options.animation) {
                const anim = this.mixer.clipAction(options.animation);
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

export class ComplexMesh {
    public static alreadyLoaded: Map<string, THREE.Group<THREE.Object3DEventMap>> = new Map();
    public static load(object: THREE.Object3D, properties: CookieCharacter) {
        const folderLocation = "fbx/char";
        const propToBone: { [key: string]: string } = {
            eyes: "mixamorigHead",
            hair: "mixamorigHead",
            mouth: "mixamorigHead",
            glassess: "mixamorigHeadTop_End",
        };
        const propDiff: { [key: string]: THREE.Vector3 } = {
            glassess:
                // @ts-ignore
                globalThis.glassess ?? new THREE.Vector3(0, 0, 0),
        };
        return new Promise<{ object: THREE.Object3D; meshes: THREE.Group<THREE.Object3DEventMap>[]; update: () => void }>((resolve, reject) => {
            try {
                const loader = new FBXLoader();
                const propToFBX: { [key: string]: THREE.Group<THREE.Object3DEventMap> } = {};

                for (const x of Object.entries(properties)) {
                    if (typeof x[1] === "number") {
                        const tempFBX = ComplexMesh.alreadyLoaded.get(`${x[0]},${x[1].toString()}`);
                        if (tempFBX !== undefined) {
                            console.log("yae!!");
                            propToFBX[x[0]] = tempFBX.clone();
                        } else {
                            const _folder = folderLocation + "/" + x[0];
                            const _item = x[1] + ".fbx";

                            loader.load(_folder + "/" + _item, (v) => {
                                ComplexMesh.alreadyLoaded.set(`${x[0]},${x[1].toString()}`, v);
                                console.log(ComplexMesh.alreadyLoaded);
                                console.log(`loaded! ${_folder + "/" + _item}`);
                                propToFBX[x[0]] = v.clone();
                            });
                        }
                    }
                }

                loader.manager.onLoad = () => {
                    const keys = Object.keys(propToFBX);

                    function AddMesh(meshName: string) {
                        if (keys.includes(meshName)) {
                            const bone = findBoneByName(object, propToBone[meshName]);
                            if (bone) {
                                bone.attach(propToFBX[meshName]);
                            }
                        }
                    }
                    function UpdateMesh(meshName: string) {
                        if (keys.includes(meshName)) {
                            const bone = findBoneByName(object, propToBone[meshName]);
                            if (bone) {
                                const boneMatrix = new THREE.Matrix4();
                                bone.updateMatrixWorld(true);
                                boneMatrix.copy(bone.matrixWorld);

                                propToFBX[meshName].position.setFromMatrixPosition(boneMatrix);
                                propToFBX[meshName].rotation.setFromRotationMatrix(boneMatrix);

                                if (Object.keys(propDiff).includes(meshName)) {
                                    propToFBX[meshName].position.add(propDiff[meshName]);
                                }
                            }
                        }
                    }

                    AddMesh("eyes");
                    AddMesh("hair");
                    AddMesh("mouth");
                    AddMesh("glassess");

                    resolve({
                        meshes: Object.values(propToFBX),
                        object: object,
                        update: () => {
                            UpdateMesh("eyes");
                            UpdateMesh("hair");
                            UpdateMesh("mouth");
                            UpdateMesh("glassess");
                        },
                    });
                };
            } catch (r) {
                reject(r);
            }
        });
    }
}
