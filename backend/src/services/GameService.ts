import { Ship, MoveResult } from "../types";
import { Utils } from "../utils";

export class GameService {
  static validateShipPlacement(ships: Ship[], boardSize: number = 10): boolean {
    // Check ships are within board bounds
    if (
      ships.some((ship) =>
        ship.positions.some(
          (pos) => !Utils.validateCoordinates(pos.x, pos.y, boardSize)
        )
      )
    ) {
      return false;
    }

    // Check ships don't overlap
    if (Utils.hasOverlappingShips(ships)) {
      return false;
    }

    // Check ships are correct lengths
    if (!Utils.validateAllShipLengths(ships)) {
      return false;
    }

    // Check ships form continuous lines (no diagonal or scattered placement)
    if (ships.some((ship) => !Utils.validateShipContinuity(ship))) {
      return false;
    }

    // Check all required ships are placed
    if (!Utils.validateRequiredShips(ships)) {
      return false;
    }

    return true;
  }

  static processMove(
    targetBoard: (string | null)[][],
    ships: Ship[],
    x: number,
    y: number
  ): MoveResult {
    const position = { x, y };

    // Check if there's a ship at target position
    const hitShip = Utils.findShipAtPosition(ships, position);

    if (!hitShip) {
      // Miss - mark on board
      targetBoard[x][y] = "miss";
      return { hit: false };
    }

    // Hit - mark on board
    targetBoard[x][y] = hitShip.id;

    // Get all hit positions for this ship from the board
    const hitPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < targetBoard.length; i++) {
      for (let j = 0; j < targetBoard[i].length; j++) {
        if (targetBoard[i][j] === hitShip.id) {
          hitPositions.push({ x: i, y: j });
        }
      }
    }

    // Check if ship is destroyed
    const shipDestroyed = Utils.isShipDestroyed(hitShip, hitPositions);
    if (shipDestroyed) {
      hitShip.isDestroyed = true;
    }

    // Check if game is won
    const gameEnded = Utils.areAllShipsDestroyed(ships);

    return {
      hit: true,
      shipDestroyed,
      gameEnded,
      winner: gameEnded ? "current_player" : undefined,
    };
  }

  static isValidTarget(board: boolean[][], x: number, y: number): boolean {
    // Check coordinates are within bounds
    if (!Utils.validateCoordinates(x, y, board.length)) {
      return false;
    }

    // Check position hasn't been targeted before
    if (Utils.isPositionTargeted(board, x, y)) {
      return false;
    }

    return true;
  }

  static checkGameEnd(ships: Ship[]): boolean {
    // Check if all ships are destroyed
    return Utils.areAllShipsDestroyed(ships);
  }

  static initializeBoard(size: number = 10): (string | null)[][] {
    return Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));
  }
}
