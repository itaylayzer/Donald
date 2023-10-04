import * as CANNON from "cannon-es";

export const groundMaterial = new CANNON.Material("ground");
export const playerMaterial = new CANNON.Material("player");
playerMaterial.friction = 0.4;
export const carMaterial = new CANNON.Material("car");
carMaterial.friction = 0.4;

export const ground_cm = new CANNON.ContactMaterial(groundMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,

    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRelaxation: 3,
});
export const player_ground_cm = new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
    friction: 0.4,
    restitution: 0,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRelaxation: 3,
})
export const car_cm = new CANNON.ContactMaterial(carMaterial, carMaterial, {
    friction: 1, // Increase friction to make pushing easier
    restitution: 0, // Reduce restitution to make collisions less bouncy

    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRelaxation: 3,

})
export const car_ground_cm = new CANNON.ContactMaterial(groundMaterial,carMaterial,{
    friction: 0,
    restitution: 0,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRelaxation: 3,
})