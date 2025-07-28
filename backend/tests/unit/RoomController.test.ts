import { Request, Response } from "express";
import { RoomController } from "../../src/controllers/RoomController";
import { GameRoomModel } from "../../src/models/GameRoom";
import { GameRoom, Player } from "../../src/types";

// Mock the GameRoomModel
jest.mock("../../src/models/GameRoom");
const MockedGameRoomModel = GameRoomModel as jest.Mocked<typeof GameRoomModel>;

describe("RoomController - Unit Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock response object
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    mockRequest = {};
  });

  describe("getStatus", () => {
    it("should return server statistics with active rooms and players", () => {
      // Mock data
      const mockRooms: GameRoom[] = [
        {
          id: "room1",
          players: [{ id: "p1" } as Player, { id: "p2" } as Player],
          gameState: "playing",
          currentTurn: null,
          winner: null,
          createdAt: new Date(),
        },
        {
          id: "room2",
          players: [{ id: "p3" } as Player],
          gameState: "waiting",
          currentTurn: null,
          winner: null,
          createdAt: new Date(),
        },
        {
          id: "room3",
          players: [],
          gameState: "finished",
          currentTurn: null,
          winner: null,
          createdAt: new Date(),
        },
      ];

      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.getStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith();
      expect(mockJson).toHaveBeenCalledWith({
        activeRooms: 2, // room1 and room2 (not finished)
        activePlayers: 3, // p1, p2, p3
        uptime: expect.any(Number),
      });
    });

    it("should return zero stats when no rooms exist", () => {
      MockedGameRoomModel.getAllRooms.mockReturnValue([]);

      RoomController.getStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        activeRooms: 0,
        activePlayers: 0,
        uptime: expect.any(Number),
      });
    });
  });

  describe("createRoom", () => {
    it("should create a new room and return sanitized data", () => {
      const mockRoom: GameRoom = {
        id: "new-room-id",
        players: [],
        gameState: "waiting",
        currentTurn: null,
        winner: null,
        createdAt: new Date("2023-01-01"),
      };

      MockedGameRoomModel.createRoom.mockReturnValue(mockRoom);

      RoomController.createRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.createRoom).toHaveBeenCalledWith();
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        id: "new-room-id",
        playerCount: 0,
        gameState: "waiting",
        createdAt: new Date("2023-01-01"),
      });
    });

    it("should handle errors when room creation fails", () => {
      MockedGameRoomModel.createRoom.mockImplementation(() => {
        throw new Error("Database error");
      });

      RoomController.createRoom(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Failed to create room" });
    });
  });

  describe("getRoom", () => {
    it("should return sanitized room data when room exists", () => {
      const mockPlayer: Player = {
        id: "player1",
        userId: "test_user_1",
        name: "Test Player",
        socketId: "socket1",
        isReady: true,
        ships: [],
        board: [],
        hits: [],
        misses: [],
      };

      const mockRoom: GameRoom = {
        id: "room123",
        players: [mockPlayer],
        gameState: "setup",
        currentTurn: "player1",
        winner: null,
        createdAt: new Date("2023-01-01"),
      };

      mockRequest.params = { roomId: "room123" };
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);

      RoomController.getRoom(mockRequest as Request, mockResponse as Response);

      expect(MockedGameRoomModel.getRoom).toHaveBeenCalledWith("room123");
      expect(mockJson).toHaveBeenCalledWith({
        id: "room123",
        playerCount: 1,
        players: [
          {
            id: "player1",
            name: "Test Player",
            isReady: true,
          },
        ],
        gameState: "setup",
        currentTurn: "player1",
        winner: null,
        createdAt: new Date("2023-01-01"),
      });
    });

    it("should return 404 when room does not exist", () => {
      mockRequest.params = { roomId: "nonexistent" };
      MockedGameRoomModel.getRoom.mockReturnValue(undefined);

      RoomController.getRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: "Room not found" });
    });

    it("should handle errors gracefully", () => {
      mockRequest.params = { roomId: "room123" };
      MockedGameRoomModel.getRoom.mockImplementation(() => {
        throw new Error("Database error");
      });

      RoomController.getRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Failed to get room" });
    });
  });

  describe("joinRoom", () => {
    const mockRoom: GameRoom = {
      id: "room123",
      players: [],
      gameState: "waiting",
      currentTurn: null,
      winner: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockRequest.params = { roomId: "room123" };
      mockRequest.body = { playerName: "Alice" };
    });

    it("should successfully add player to room", () => {
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);
      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(true);

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(MockedGameRoomModel.getRoom).toHaveBeenCalledWith("room123");
      expect(MockedGameRoomModel.addPlayerToRoom).toHaveBeenCalledWith(
        "room123",
        expect.objectContaining({
          name: "Alice",
          isReady: false,
          socketId: "",
          ships: [],
          board: expect.any(Array),
          hits: expect.any(Array),
          misses: expect.any(Array),
        })
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Successfully joined room",
        playerId: expect.stringMatching(/^player_\d+_[a-z0-9]+$/),
        roomId: "room123",
      });
    });

    it("should return 400 for invalid room ID", () => {
      mockRequest.params = { roomId: "" };

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: "Invalid room ID" });
    });

    it("should return 400 for missing player name", () => {
      mockRequest.body = { playerName: "" };

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: "Player name is required",
      });
    });

    it("should return 400 for non-string player name", () => {
      mockRequest.body = { playerName: 123 };

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: "Player name is required",
      });
    });

    it("should return 404 when room does not exist", () => {
      MockedGameRoomModel.getRoom.mockReturnValue(undefined);

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: "Room not found" });
    });

    it("should return 400 when unable to join room (room full or player exists)", () => {
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);
      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(false);

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error:
          "Unable to join room (room may be full or player already exists)",
      });
    });

    it("should handle errors gracefully", () => {
      MockedGameRoomModel.getRoom.mockImplementation(() => {
        throw new Error("Database error");
      });

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Failed to join room" });
    });

    it("should trim whitespace from player name", () => {
      mockRequest.body = { playerName: "  Alice  " };
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);
      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(true);

      RoomController.joinRoom(mockRequest as Request, mockResponse as Response);

      expect(MockedGameRoomModel.addPlayerToRoom).toHaveBeenCalledWith(
        "room123",
        expect.objectContaining({
          name: "Alice", // trimmed
        })
      );
    });
  });

  describe("listRooms", () => {
    const mockRooms: GameRoom[] = [
      {
        id: "room1",
        players: [{ id: "p1" } as Player],
        gameState: "waiting",
        currentTurn: null,
        winner: null,
        createdAt: new Date("2023-01-01"),
      },
      {
        id: "room2",
        players: [{ id: "p1" } as Player, { id: "p2" } as Player],
        gameState: "playing",
        currentTurn: null,
        winner: null,
        createdAt: new Date("2023-01-02"),
      },
    ];

    it("should return all rooms when no filters applied", () => {
      mockRequest.query = {};
      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({});
      expect(mockJson).toHaveBeenCalledWith({
        rooms: [
          {
            id: "room1",
            playerCount: 1,
            gameState: "waiting",
            createdAt: new Date("2023-01-01"),
          },
          {
            id: "room2",
            playerCount: 2,
            gameState: "playing",
            createdAt: new Date("2023-01-02"),
          },
        ],
        total: 2,
      });
    });

    it("should apply gameState filter", () => {
      mockRequest.query = { gameState: "waiting" };
      MockedGameRoomModel.getAllRooms.mockReturnValue([mockRooms[0]]);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({
        gameState: "waiting",
      });
    });

    it("should apply excludeFull filter", () => {
      mockRequest.query = { excludeFull: "true" };
      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({
        excludeFull: true,
      });
    });

    it("should apply maxPlayers filter", () => {
      mockRequest.query = { maxPlayers: "1" };
      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({
        maxPlayers: 1,
      });
    });

    it("should ignore invalid gameState values", () => {
      mockRequest.query = { gameState: "invalid" };
      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({});
    });

    it("should ignore invalid maxPlayers values", () => {
      mockRequest.query = { maxPlayers: "invalid" };
      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({});
    });

    it("should ignore negative maxPlayers values", () => {
      mockRequest.query = { maxPlayers: "-1" };
      MockedGameRoomModel.getAllRooms.mockReturnValue(mockRooms);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({});
    });

    it("should apply multiple filters", () => {
      mockRequest.query = {
        gameState: "waiting",
        excludeFull: "true",
        maxPlayers: "2",
      };
      MockedGameRoomModel.getAllRooms.mockReturnValue([mockRooms[0]]);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalledWith({
        gameState: "waiting",
        excludeFull: true,
        maxPlayers: 2,
      });
    });

    it("should handle errors gracefully", () => {
      mockRequest.query = {};
      MockedGameRoomModel.getAllRooms.mockImplementation(() => {
        throw new Error("Database error");
      });

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: "Failed to list rooms" });
    });

    it("should return empty list when no rooms match filters", () => {
      mockRequest.query = { gameState: "finished" };
      MockedGameRoomModel.getAllRooms.mockReturnValue([]);

      RoomController.listRooms(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        rooms: [],
        total: 0,
      });
    });
  });
});
