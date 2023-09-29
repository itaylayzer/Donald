import * as THREE from "three";
import { Player } from "./player";
export class MapCurve {
    private points: THREE.Vector3[] = [];

    constructor(data: { x: number; y: number; z: number }[]) {
        // Convert the JSON data to THREE.Vector3
        this.points = data.map((point) => new THREE.Vector3(point.x, point.y, point.z));
    }

    // Function to scale the entire curve
    scale(v: THREE.Vector3) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].multiply(v);
        }
        return this;
    }

    // Function to translate the entire curve
    translate(v: THREE.Vector3) {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].add(v);
        }
        return this;
    }

    meshes(){
        const list:THREE.Mesh[] = []
        for (let i = 0; i < this.points.length; i++) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),undefined);
            mesh.position.copy(this.points[i]).add(new THREE.Vector3(0,1,0));
            list.push(mesh)
        }
        return list;
    }

    get(index: number): THREE.Vector3 {
        return this.points[index];
      }
    

    // Function to get the nearest point on the curve to a given position
    getNearestPoint(pos: THREE.Vector3): THREE.Vector3 {
        let nearestPoint = new THREE.Vector3();
        let nearestDistance = Infinity;
        let nearestId;
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
                    nearestId = i;
                }
            }
        }
        console.log("nearestId",nearestId);

        return nearestPoint;
    }

    rankPlayers(players: Player[]): Map<string, number> {
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
}
