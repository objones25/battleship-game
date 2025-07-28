import { GameService } from "../../src/services/GameService";
import { Ship } from "../../src/types";

describe("GameService", () => {
  describe("validateShipPlacement", () => {
    const validShips: Ship[] = [
      {
        id: "carrier",
        name: "Carrier",
        length: 5,
        positions: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
          { x: 0, y: 3 },
          { x: 0, y: 4 },
        ],
        isDestroyed: false,
      },
      {
        id: "battleship",
        name: "Battleship",
        length: 4,
        positions: [
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
          { x: 2, y: 3 },
        ],
        isDestroyed: false,
      },
      {
        id: "cruiser",
        name: "Cruiser",
        length: 3,
        positions: [
          { x: 4, y: 0 },
          { x: 4, y: 1 },
          { x: 4, y: 2 },
        ],
        isDestroyed: false,
      },
      {
        id: "submarine",
        name: "Submarine",
        length: 3,
        positions: [
          { x: 6, y: 0 },
          { x: 6, y: 1 },
          { x: 6, y: 2 },
        ],
        isDestroyed: false,
      },
      {
        id: "destroyer",
        name: "Destroyer",
        length: 2,
        positions: [
          { x: 8, y: 0 },
          { x: 8, y: 1 },
        ],
        isDestroyed: false,
      },
    ];

    it("should validate correct ship placement", () => {
      expect(GameService.validateShipPlacement(validShips)).toBe(true);
    });

    it("should reject ships outside board bounds", () => {
      const invalidShips: Ship[] = [
        {
          id: "carrier",
          name: "Carrier",
          length: 5,
          positions: [
            { x: 0, y: 6 },
            { x: 0, y: 7 },
            { x: 0, y: 8 },
            { x: 0, y: 9 },
            { x: 0, y: 10 }, // Outside bounds
          ],
          isDestroyed: false,
        },
      ];

      expect(GameService.validateShipPlacement(invalidShips)).toBe(false);
    });

    it("should reject overlapping ships", () => {
      const overlappingShips: Ship[] = [
        {
          id: "ship1",
          name: "Ship1",
          length: 2,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
          isDestroyed: false,
        },
        {
          id: "ship2",
          name: "Ship2",
          length: 2,
          positions: [
            { x: 0, y: 1 }, // Overlaps with ship1
            { x: 0, y: 2 },
          ],
          isDestroyed: false,
        },
      ];

      expect(GameService.validateShipPlacement(overlappingShips)).toBe(false);
    });

    it("should reject ships with incorrect lengths", () => {
      const incorrectLengthShips: Ship[] = [
        {
          id: "carrier",
          name: "Carrier",
          length: 5,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 }, // Only 3 positions for length 5
          ],
          isDestroyed: false,
        },
      ];

      expect(GameService.validateShipPlacement(incorrectLengthShips)).toBe(
        false
      );
    });

    it("should reject non-continuous ship placement", () => {
      const nonContinuousShips: Ship[] = [
        {
          id: "ship",
          name: "Ship",
          length: 3,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 2 }, // Gap at y: 1
            { x: 0, y: 3 },
          ],
          isDestroyed: false,
        },
      ];

      expect(GameService.validateShipPlacement(nonContinuousShips)).toBe(false);
    });

    it("should reject diagonal ship placement", () => {
      const diagonalShips: Ship[] = [
        {
          id: "ship",
          name: "Ship",
          length: 3,
          positions: [
            { x: 0, y: 0 },
            { x: 1, y: 1 }, // Diagonal
            { x: 2, y: 2 },
          ],
          isDestroyed: false,
        },
      ];

      expect(GameService.validateShipPlacement(diagonalShips)).toBe(false);
    });

    it("should reject incomplete ship set", () => {
      const incompleteShips: Ship[] = [
        {
          id: "carrier",
          name: "Carrier",
          length: 5,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
            { x: 0, y: 3 },
            { x: 0, y: 4 },
          ],
          isDestroyed: false,
        },
        // Missing other required ships
      ];

      expect(GameService.validateShipPlacement(incompleteShips)).toBe(false);
    });
  });

  describe("processMove", () => {
    let targetBoard: (string | null)[][];
    let ships: Ship[];

    beforeEach(() => {
      targetBoard = GameService.initializeBoard();
      ships = [
        {
          id: "ship1",
          name: "Test Ship",
          length: 2,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
          isDestroyed: false,
        },
      ];
    });

    it("should return miss for empty position", () => {
      const result = GameService.processMove(targetBoard, ships, 5, 5);

      expect(result.hit).toBe(false);
      expect(targetBoard[5][5]).toBe("miss");
    });

    it("should return hit for ship position", () => {
      const result = GameService.processMove(targetBoard, ships, 0, 0);

      expect(result.hit).toBe(true);
      expect(targetBoard[0][0]).toBe("ship1");
    });

    it("should mark ship as destroyed when all positions hit", () => {
      // Hit first position
      GameService.processMove(targetBoard, ships, 0, 0);

      // Hit second position
      const result = GameService.processMove(targetBoard, ships, 0, 1);

      expect(result.hit).toBe(true);
      expect(result.shipDestroyed).toBe(true);
      expect(ships[0].isDestroyed).toBe(true);
    });

    it("should detect game end when all ships destroyed", () => {
      // Hit all positions of the ship
      GameService.processMove(targetBoard, ships, 0, 0);
      const result = GameService.processMove(targetBoard, ships, 0, 1);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe("current_player");
    });
  });

  describe("isValidTarget", () => {
    let board: boolean[][];

    beforeEach(() => {
      board = Array(10)
        .fill(null)
        .map(() => Array(10).fill(false));
    });

    it("should return true for valid untargeted position", () => {
      expect(GameService.isValidTarget(board, 5, 5)).toBe(true);
    });

    it("should return false for out of bounds position", () => {
      expect(GameService.isValidTarget(board, -1, 5)).toBe(false);
      expect(GameService.isValidTarget(board, 10, 5)).toBe(false);
      expect(GameService.isValidTarget(board, 5, -1)).toBe(false);
      expect(GameService.isValidTarget(board, 5, 10)).toBe(false);
    });

    it("should return false for already targeted position", () => {
      board[3][3] = true; // Mark as targeted
      expect(GameService.isValidTarget(board, 3, 3)).toBe(false);
    });
  });

  describe("checkGameEnd", () => {
    it("should return true when all ships are destroyed", () => {
      const ships: Ship[] = [
        {
          id: "ship1",
          name: "Ship1",
          length: 2,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
          isDestroyed: true,
        },
        {
          id: "ship2",
          name: "Ship2",
          length: 2,
          positions: [
            { x: 2, y: 0 },
            { x: 2, y: 1 },
          ],
          isDestroyed: true,
        },
      ];

      expect(GameService.checkGameEnd(ships)).toBe(true);
    });

    it("should return false when some ships are not destroyed", () => {
      const ships: Ship[] = [
        {
          id: "ship1",
          name: "Ship1",
          length: 2,
          positions: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
          isDestroyed: true,
        },
        {
          id: "ship2",
          name: "Ship2",
          length: 2,
          positions: [
            { x: 2, y: 0 },
            { x: 2, y: 1 },
          ],
          isDestroyed: false,
        },
      ];

      expect(GameService.checkGameEnd(ships)).toBe(false);
    });
  });

  describe("initializeBoard", () => {
    it("should create a 10x10 board by default", () => {
      const board = GameService.initializeBoard();

      expect(board).toHaveLength(10);
      expect(board[0]).toHaveLength(10);
      expect(board[9][9]).toBeNull();
    });

    it("should create a board of specified size", () => {
      const board = GameService.initializeBoard(5);

      expect(board).toHaveLength(5);
      expect(board[0]).toHaveLength(5);
      expect(board[4][4]).toBeNull();
    });
  });
});
