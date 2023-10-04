import * as THREE from "three";
import { Player } from "./player";
export class MapCurve {
    public points: THREE.Vector3[] = [];
    public static deltaTime: number;
    public readonly winningIndex: number;
    constructor(data: { x: number; y: number; z: number }[], winningIndex: number) {
        // Convert the JSON data to THREE.Vector3
        this.points = data.map((point) => new THREE.Vector3(point.x, point.y, point.z));

        this.winningIndex = winningIndex;
    }

    // Function to scale the entire curve
    public scale(v: THREE.Vector3) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].multiply(v);
        }
        return this;
    }

    // Function to translate the entire curve
    public translate(v: THREE.Vector3) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].add(v);
        }
        return this;
    }

    public meshes() {
        const list: THREE.Mesh[] = [];
        for (let i = 0; i < this.points.length; i++) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), undefined);
            mesh.position.copy(this.points[i]).add(new THREE.Vector3(0, 1, 0));
            list.push(mesh);
        }
        return list;
    }

    public get(index: number): THREE.Vector3 {
        return this.points[index];
    }

    // Function to get the nearest point on the curve to a given position
    public getNearestPoint(pos: THREE.Vector3): THREE.Vector3 {
        let nearestPoint = new THREE.Vector3();
        let nearestDistance = Infinity;
        // Iterate through pairs of control points
        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];

            // Interpolate points along the curve
            for (let t = 0; t <= 1; t += 0.01) {
                const pointOnCurve = p1.clone().lerp(p2, t);
                const distance = pos.distanceTo(pointOnCurve);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPoint.copy(pointOnCurve);
                }
            }
        }

        return nearestPoint;
    }

    public rankPlayers(players: Player[]): Map<string, number> {
        // Create an array to store the position index and rounds completed for each player
        const playerInfo: { player: Player; positionIndex: number; rounds: number }[] = [];

        // Calculate the position index and rounds completed for each player
        players.forEach((player) => {
            const playerPosition = player.mesh.position; // Replace with your player's position retrieval logic
            let positionIndex = 0;

            // Iterate through the curve points to find the position index
            for (let i = 0; i < this.points.length - 1; i++) {
                const p1 = this.points[i];
                const p2 = this.points[i + 1];

                const distanceToP1 = playerPosition.distanceTo(p1);
                const distanceToP2 = playerPosition.distanceTo(p2);

                if (distanceToP1 < distanceToP2) {
                    // Player is closer to p1
                    positionIndex += i + distanceToP1 / p1.distanceTo(p2);
                    break;
                } else if (i === this.points.length - 2) {
                    // Player is closest to the last segment
                    positionIndex += i + 1;
                }
            }

            playerInfo.push({ player, positionIndex, rounds: player.rounds });
        });

        // Sort players by rounds completed (descending order) and then by position index (ascending order)
        playerInfo.sort((a, b) => {
            if (a.rounds === b.rounds) {
                return a.positionIndex - b.positionIndex;
            }
            return b.rounds - a.rounds;
        });

        // Create a map to store player rankings
        const playerRankings = new Map<string, number>();

        // Assign rankings based on position in the sorted playerInfo array
        // console.log("playerInfo.length",playerInfo.length,playerInfo.map(v=>v.player.id))
        for (let i = 0; i < playerInfo.length; i++) {
            const player = playerInfo[i].player;
            playerRankings.set(player.id, i + 1); // Adding 1 to start rankings from 1
        }

        return playerRankings;
    }

    public findClosestPointIndex(position: THREE.Vector3): number {
        let closestIndex = 0;
        let closestDistance = position.distanceTo(this.points[0]);

        for (let i = 1; i < this.points.length; i++) {
            const distance = position.distanceTo(this.points[i]);
            if (distance < closestDistance) {
                closestIndex = i;
                closestDistance = distance;
            }
        }

        return closestIndex;
    }

    public movePlayerWithRocket(
        duration: number,
        currentPlayerPos: THREE.Vector3,
        rocketSpeed: number,
        update: (v: THREE.Vector3, r: number) => void,
        finished: () => void
    ): void {
        let timeElapsed = 0;

        const currentPosition = currentPlayerPos.clone();
        const updatePosition = () => {
            // Calculate the distance to move based on rocketSpeed and deltaTime

            const deltaTime = MapCurve.deltaTime;

            // Find the closest point index to the current player position
            const currentPositionIndex = this.findClosestPointIndex(currentPlayerPos);

            // Calculate the next position index
            let nextPositionIndex = currentPositionIndex + 1;

            // Check if the next position exceeds the bounds of the points array
            if (nextPositionIndex >= this.points.length) {
                // Wrap around to the beginning of the curve
                nextPositionIndex %= this.points.length;
            }
            // Interpolate between the current and next points based on distanceToMove
            // Calculate the new position based on velocity and deltaTime
            const nextPosition = this.points[nextPositionIndex];
            const velocity = nextPosition
                .clone()
                .sub(currentPosition)
                .normalize()
                .multiplyScalar(rocketSpeed * deltaTime);
            currentPosition.add(velocity);

            const direction = nextPosition.clone().sub(currentPosition).normalize();
            const currentRotation = Math.atan2(direction.z, direction.x); // Calculate the new rotation in radians

            // Update the player's position using the update function
            update(currentPosition, currentRotation * THREE.MathUtils.RAD2DEG);
            // Update the time elapsed
            timeElapsed += MapCurve.deltaTime * 1000;
            // Check if the duration is complete
            if (timeElapsed < duration * 1000) {
                requestAnimationFrame(updatePosition);
            } else {
                // Rocket item duration is complete
                finished();
            }
        };

        // Start the animation loop
        requestAnimationFrame(updatePosition);
    }

    public moveElectricWheel(
        wheelSpeed: number,
        players: Player[],
        currentPlayerPos: THREE.Vector3,
        onNearby: (player: Player, timestamp: number) => void,
        onDestroy: () => void,
        update: (v: THREE.Vector3, r: number) => void,
        isBackwards: boolean = false
    ): void {
        let timeElapsed = 0;
        let currentPositionIndex = 0;
        const maxDistanceToPlayer = 20; // Define the maximum distance to consider a player nearby
        const minAngle = -30; // Minimum angle in degrees
        const maxAngle = 30; // Maximum angle in degrees

        let destroyed = false;
        const currentPosition = currentPlayerPos.clone();
        const updatePosition = () => {
            if (destroyed) {
                return;
            }

            // Calculate deltaTime
            const deltaTime = MapCurve.deltaTime;

            // Find the closest point index to the current wheel position
            currentPositionIndex = this.findClosestPointIndex(currentPosition);

            // Calculate the next position index
            let nextPositionIndex = currentPositionIndex + (isBackwards ? -1 : 1);

            // Check if the next position exceeds the bounds of the points array
            if (nextPositionIndex < 0) {
                // Wrap around to the end of the curve
                nextPositionIndex = this.points.length - 1;
            } else if (nextPositionIndex >= this.points.length) {
                // Wrap around to the beginning of the curve
                nextPositionIndex = 0;
            }

            // Calculate the new position based on velocity and deltaTime

            const nextPosition = this.points[nextPositionIndex];
            const velocity = nextPosition
                .clone()
                .sub(currentPosition)
                .normalize()
                .multiplyScalar(wheelSpeed * deltaTime);
            currentPosition.add(velocity);

            const direction = nextPosition.clone().sub(currentPosition).normalize();
            const currentRotation = Math.atan2(direction.z, direction.x); // Calculate the new rotation in radians

            // Update the player's position using the update function
            update(currentPosition, currentRotation * THREE.MathUtils.RAD2DEG);

            // Check for nearby players
            const nearbyPlayer = this.getNearbyPlayers(players, currentPosition, maxDistanceToPlayer, minAngle, maxAngle);

            if (nearbyPlayer !== null) {
                // Wheel found nearby players, call onNearby function
                onNearby(nearbyPlayer, timeElapsed); // Assuming you want to interact with the closest player
                destroyed = true;
                // onDestroy(); // Call onDestroy function
                return;
            }

            // Update the time elapsed
            timeElapsed += deltaTime * 1000;

            // Check if the duration is complete (5 seconds)
            if (timeElapsed < 5 * 1000) {
                requestAnimationFrame(updatePosition);
            } else {
                // Electric Wheel duration is complete
                destroyed = true;
                onDestroy(); // Call onDestroy function
            }
        };

        // Start the animation loop
        requestAnimationFrame(updatePosition);
    }

    private getNearbyPlayers(
        players: Player[],
        currentPosition: THREE.Vector3,
        maxDistance: number,
        minAngle: number,
        maxAngle: number
    ): Player | null {
        let nearestPlayer = null;
        let nearestDistance = maxDistance;
        const wheelDirection = currentPosition.clone().normalize(); // Direction of the Electric Wheel

        for (const player of players) {
            // Calculate the vector from the player's position to the current position
            const playerToCurrent = currentPosition.clone().sub(player.mesh.position).normalize();

            // Calculate the angle between the Electric Wheel direction and player-to-current vector
            const angle = (Math.acos(wheelDirection.dot(playerToCurrent)) * 180) / Math.PI;
            const fixedAngle = (-angle + 90) / 2;

            // Calculate the distance between the player's position and the current position
            const distance = player.mesh.position.distanceTo(currentPosition);

            if (distance <= maxDistance && fixedAngle >= minAngle && fixedAngle <= maxAngle && distance < nearestDistance) {
                // Update the nearest player and nearest distance
                nearestPlayer = player;
                nearestDistance = distance;
            }
        }

        return nearestPlayer;
    }
}
