import * as CANNON from "cannon-es";

export const groundMaterial = new CANNON.Material("ground");
export const ground_cm = new CANNON.ContactMaterial(groundMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,

    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRelaxation: 3,
});
