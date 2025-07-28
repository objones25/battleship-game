import { Ship } from "../types";

export class Utils {
  static generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  static generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  static validateCoordinates(
    x: number,
    y: number,
    boardSize: number = 10
  ): boolean {
    return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
  }

  /**
   * Check if two positions are the same
   */
  static positionsEqual(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  /**
   * Check if two ships have overlapping positions
   */
  static shipsOverlap(ship1: Ship, ship2: Ship): boolean {
    return ship1.positions.some((pos1) =>
      ship2.positions.some((pos2) => this.positionsEqual(pos1, pos2))
    );
  }

  /**
   * Check if any ships in the array have overlapping positions
   */
  static hasOverlappingShips(ships: Ship[]): boolean {
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        if (this.shipsOverlap(ships[i], ships[j])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a position is occupied by any ship
   */
  static isPositionOccupied(
    position: { x: number; y: number },
    ships: Ship[]
  ): boolean {
    return ships.some((ship) =>
      ship.positions.some((pos) => this.positionsEqual(pos, position))
    );
  }

  /**
   * Check if a position has been targeted before on a board
   */
  static isPositionTargeted(board: boolean[][], x: number, y: number): boolean {
    return board[x] && board[x][y] === true;
  }

  /**
   * Find ship at a specific position
   */
  static findShipAtPosition(
    ships: Ship[],
    position: { x: number; y: number }
  ): Ship | null {
    return (
      ships.find((ship) =>
        ship.positions.some((pos) => this.positionsEqual(pos, position))
      ) || null
    );
  }

  /**
   * Check if a ship is completely destroyed (all positions hit)
   */
  static isShipDestroyed(
    ship: Ship,
    hitPositions: { x: number; y: number }[]
  ): boolean {
    return ship.positions.every((pos) =>
      hitPositions.some((hitPos) => this.positionsEqual(pos, hitPos))
    );
  }

  /**
   * Check if all ships are destroyed
   */
  static areAllShipsDestroyed(ships: Ship[]): boolean {
    return ships.every((ship) => ship.isDestroyed);
  }

  /**
   * Check if a ship's positions match its declared length
   */
  static validateShipLength(ship: Ship): boolean {
    return ship.positions.length === ship.length;
  }

  /**
   * Check if all ships have correct lengths
   */
  static validateAllShipLengths(ships: Ship[]): boolean {
    return ships.every((ship) => this.validateShipLength(ship));
  }

  /**
   * Check if ship positions form a continuous line (horizontal or vertical)
   */
  static validateShipContinuity(ship: Ship): boolean {
    if (ship.positions.length <= 1) return true;

    // Sort positions to check continuity
    const sortedPositions = [...ship.positions].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

    // Check if horizontal
    const isHorizontal = sortedPositions.every((pos, index) => {
      if (index === 0) return true;
      return (
        pos.y === sortedPositions[0].y &&
        pos.x === sortedPositions[index - 1].x + 1
      );
    });

    // Check if vertical
    const isVertical = sortedPositions.every((pos, index) => {
      if (index === 0) return true;
      return (
        pos.x === sortedPositions[0].x &&
        pos.y === sortedPositions[index - 1].y + 1
      );
    });

    return isHorizontal || isVertical;
  }

  /**
   * Standard battleship ship requirements
   */
  static getRequiredShips(): { name: string; length: number; count: number }[] {
    return [
      { name: "Carrier", length: 5, count: 1 },
      { name: "Battleship", length: 4, count: 1 },
      { name: "Cruiser", length: 3, count: 1 },
      { name: "Submarine", length: 3, count: 1 },
      { name: "Destroyer", length: 2, count: 1 },
    ];
  }

  /**
   * Check if all required ships are present
   */
  static validateRequiredShips(ships: Ship[]): boolean {
    const required = this.getRequiredShips();
    const shipCounts = new Map<number, number>();

    // Count ships by length
    ships.forEach((ship) => {
      const count = shipCounts.get(ship.length) || 0;
      shipCounts.set(ship.length, count + 1);
    });

    // Check if we have the required ships
    return required.every((req) => {
      const actualCount = shipCounts.get(req.length) || 0;
      return actualCount >= req.count;
    });
  }
}
