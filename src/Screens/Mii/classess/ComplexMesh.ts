import { findBoneByName } from "../assets/functions";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { CookieCharacter } from "../assets/types";
import * as THREE from "three";

export class ComplexMesh {
    public static alreadyLoaded: Map<string, THREE.Group<THREE.Object3DEventMap>> = new Map();
    public static load(object: THREE.Object3D, properties: CookieCharacter) {
        const folderLocation = "fbx/char";
        const propToBone: { [key: string]: string } = {
            eyes: "Nose",
            hair: "mixamorigHeadTop_End",
            mouth: "Mouth",
            glassess: "Nose",
        };
        return new Promise<{ object: THREE.Object3D; meshes: THREE.Group<THREE.Object3DEventMap>[]; update: () => void }>((resolve, reject) => {
            try {
                const loader = new FBXLoader();
                const propToFBX: { [key: string]: THREE.Group<THREE.Object3DEventMap> } = {};
                let loadingItems = 0;
                for (const x of Object.entries(properties)) {
                    if (typeof x[1] === "number") {
                        const tempFBX = ComplexMesh.alreadyLoaded.get(`${x[0]},${x[1].toString()}`);
                        if (tempFBX !== undefined) {
                            propToFBX[x[0]] = tempFBX.clone();
                        } else {
                            loadingItems++;
                            const _folder = folderLocation + "/" + x[0];
                            const _item = x[1] + ".fbx";

                            loader.load(_folder + "/" + _item, (v) => {
                                ComplexMesh.alreadyLoaded.set(`${x[0]},${x[1].toString()}`, v);
                                propToFBX[x[0]] = v.clone();
                            });
                        }
                    }
                }

                function done() {
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
                            let bone:THREE.Object3D | undefined = findBoneByName(object, propToBone[meshName]);
                            if (bone) {
                                const boneMatrix = new THREE.Matrix4();
                                bone.updateMatrix();
                                boneMatrix.copy(bone.matrixWorld);


                                if (propToFBX[meshName]) {
                                    // console.log(propToFBX[meshName].position);
                                    bone.attach(propToFBX[meshName]);
        
                                    propToFBX[meshName].position.x *= object.scale.x;
                                    propToFBX[meshName].position.y *= object.scale.y;
                                    propToFBX[meshName].position.z *= object.scale.z;
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
                }
                if (loadingItems > 0) {
                    loader.manager.onLoad = () => {
                        done();
                    };
                } else {
                    done();
                }
            } catch (r) {
                reject(r);
            }
        });
    }
}