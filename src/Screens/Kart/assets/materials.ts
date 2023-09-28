import * as CANNON from "cannon-es";

export const groundMaterial = new CANNON.Material("ground");
export const softObj = new CANNON.Material("softObj");
export const ground_cm = new CANNON.ContactMaterial(groundMaterial, groundMaterial, {
    friction: 1,
    restitution: 1,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
});
