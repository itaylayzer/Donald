import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { CookieCharacter } from "../assets/types";
import { ComplexMesh } from "./ComplexMesh";
import { Character } from "./Character";

export class CharactersList {
    public staticMesh: THREE.Object3D<THREE.Object3DEventMap>;
    public list: Map<string, Character>;
    private _add: (c: Character) => void;
    // @ts-ignore
    private _remove: (obj: THREE.Object3D) => void;
    private _addProp: (p: THREE.Group<THREE.Object3DEventMap>) => void;
    public starterAnimation: undefined | THREE.AnimationClip;
    constructor(
        mesh: THREE.Group<THREE.Object3DEventMap>,
        args: {
            add: (c: Character) => void;
            remove: (obj: THREE.Object3D) => void;
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
            xchar.props = result.meshes;
            for (const x of result.meshes) {
                this._addProp(x);
            }
        }

        this._add(xchar);
        this.list.set(name, xchar);
        return xchar;
    }

    public remove(name: string) {
        const xchar = this.list.get(name);
        if (xchar === undefined) return;
        this._remove(xchar.mesh);
        for (const _prop of xchar.props) {
            this._remove(_prop);
        }
        xchar.pointer.destroy();
        this.list.delete(name);
    }

    public removeAll(){
        for(const x of Array.from(this.list.keys())){
            this.remove(x);
        }
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