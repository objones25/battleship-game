import { Server } from "socket.io";
import { createServer } from "http";
import { Socket } from "socket.io";
import { GameSocketHandler } from "../../src/sockets/GameSocketHandler";
import { GameRoomModel } from "../../src/models/GameRoom";
import { GameService } from "../../src/services/GameService";
import { Ship, Player, GameRoom } from "../../src/types";

// Mock the dependencies
jest.mock("../../src/models/GameRoom");
jest.mock("../../src/services/GameService");
jest.mock("../../src/utils", () => ({
  Utils: {
    generatePlayerId: jest.fn(() => "test-player-id"),
    generateRoomId: jest.fn(() => "test-room-id"),
  },
}));

const MockedGameRoomModel = GameRoomModel as jest.Mocked<typeof GameRoomModel>;
const MockedGameService = GameService as jest.Mocked<typeof GameService>;

describe("GameSocketHandler", () => {
  let io: Server;
  let handler: GameSocketHandler;
  let mockSocket: Partial<Socket>;
  let httpServer: ReturnType<typeof createServer>;

  const createMockPlayer = (
    id: string,
    name: string,
    socketId: string
  ): Player => ({
    id,
    name,
    socketId,
    isReady: false,
    board: Array(10)
      .fill(null)
      .map(() => Array(10).fill(null)),
    ships: [],
    hits: Array(10)
      .fill(null)
      .map(() => Array(10).fill(false)),
    misses: Array(10)
      .fill(null)
      .map(() => Array(10).fill(false)),
  });

  const createMockRoom = (id: string, players: Player[]): GameRoom => ({
    id,
    players,
    gameState: "waiting",
    currentTurn: null,
    winner: null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    // Create HTTP server and Socket.IO server
    httpServer = createServer();
    io = new Server(httpServer);
    handler = new GameSocketHandler(io);

    // Create mock socket
    mockSocket = {
      id: "socket123",
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn(),
    };

    // Mock io.to method
    io.to = jest.fn().mockReturnValue({
      emit: jest.fn(),
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear any pending timers to prevent Jest from hanging
    handler.clearAllTimers();
    httpServer.close();
  });

  describe("handleConnection", () => {
    it("should set up all socket event listeners", () => {
      handler.handleConnection(mockSocket as Socket);

      expect(mockSocket.on).toHaveBeenCalledWith(
        "join-room",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "leave-room",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "place-ships",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "player-ready",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "make-move",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "chat-message",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "restart-game",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        "disconnect",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
    });
  });

  describe("join-room event", () => {
    let joinRoomHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const joinRoomCall = onCalls.find(
        (call: [string, Function]) => call[0] === "join-room"
      );
      joinRoomHandler = joinRoomCall![1];

      // Mock GameService.initializeBoard
      MockedGameService.initializeBoard.mockReturnValue(
        Array(10)
          .fill(null)
          .map(() => Array(10).fill(null))
      );
    });

    it("should successfully join a room", () => {
      const mockPlayer = createMockPlayer(
        "test-player-id",
        "Test Player",
        "socket123"
      );
      const mockRoom = createMockRoom("room123", [mockPlayer]);

      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(true);
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);

      joinRoomHandler({
        roomId: "room123",
        playerName: "Test Player",
      });

      expect(MockedGameRoomModel.addPlayerToRoom).toHaveBeenCalled();
      expect(mockSocket.join).toHaveBeenCalledWith("room123");
      expect(mockSocket.emit).toHaveBeenCalledWith("joined-room", {
        success: true,
        playerId: "test-player-id",
        room: mockRoom,
      });
    });

    it("should handle failed room join", () => {
      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(false);

      joinRoomHandler({
        roomId: "room123",
        playerName: "Test Player",
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("joined-room", {
        success: false,
        error: "Could not join room",
      });
    });

    it("should handle errors during room join", () => {
      MockedGameRoomModel.addPlayerToRoom.mockImplementation(() => {
        throw new Error("Database error");
      });

      joinRoomHandler({
        roomId: "room123",
        playerName: "Test Player",
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("joined-room", {
        success: false,
        error: "Server error",
      });
    });
  });

  describe("place-ships event", () => {
    let placeShipsHandler: Function;
    let mockShips: Ship[];

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const placeShipsCall = onCalls.find(
        (call: [string, Function]) => call[0] === "place-ships"
      );
      placeShipsHandler = placeShipsCall![1];

      mockShips = [
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

    it("should reject invalid ship placement", () => {
      MockedGameService.validateShipPlacement.mockReturnValue(false);

      placeShipsHandler({
        roomId: "room123",
        ships: mockShips,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("ships-placed", {
        success: false,
        error: "Player not found",
      });
    });

    it("should validate ship placement", () => {
      MockedGameService.validateShipPlacement.mockReturnValue(false);

      placeShipsHandler({
        roomId: "room123",
        ships: mockShips,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith("ships-placed", {
        success: false,
        error: "Player not found",
      });
    });
  });

  describe("make-move event", () => {
    let makeMoveHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const makeMoveCall = onCalls.find(
        (call: [string, Function]) => call[0] === "make-move"
      );
      makeMoveHandler = makeMoveCall![1];
    });

    it("should handle move when player not found", () => {
      makeMoveHandler({
        roomId: "room123",
        x: 5,
        y: 5,
      });

      // Should not crash and should handle gracefully
      expect(mockSocket.emit).not.toHaveBeenCalledWith("move-result", {
        success: true,
      });
    });
  });

  describe("player-ready event", () => {
    let playerReadyHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const playerReadyCall = onCalls.find(
        (call: [string, Function]) => call[0] === "player-ready"
      );
      playerReadyHandler = playerReadyCall![1];
    });

    it("should handle ready when player not found", () => {
      playerReadyHandler({
        roomId: "room123",
      });

      // Should not crash and should handle gracefully
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe("chat-message event", () => {
    let chatMessageHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const chatMessageCall = onCalls.find(
        (call: [string, Function]) => call[0] === "chat-message"
      );
      chatMessageHandler = chatMessageCall![1];
    });

    it("should handle chat message when player not found", () => {
      chatMessageHandler({
        roomId: "room123",
        message: "Hello everyone!",
      });

      // Should not crash and should handle gracefully
      expect(io.to).not.toHaveBeenCalled();
    });
  });

  describe("restart-game event", () => {
    let restartGameHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const restartGameCall = onCalls.find(
        (call: [string, Function]) => call[0] === "restart-game"
      );
      restartGameHandler = restartGameCall![1];

      // Mock GameService.initializeBoard
      MockedGameService.initializeBoard.mockReturnValue(
        Array(10)
          .fill(null)
          .map(() => Array(10).fill(null))
      );
    });

    it("should handle restart when player not found", () => {
      restartGameHandler({
        roomId: "room123",
      });

      // Should not crash and should handle gracefully
      expect(io.to).not.toHaveBeenCalled();
    });
  });

  describe("disconnect event", () => {
    let disconnectHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const disconnectCall = onCalls.find(
        (call: [string, Function]) => call[0] === "disconnect"
      );
      disconnectHandler = disconnectCall![1];
    });

    it("should handle disconnect gracefully when no player is mapped", () => {
      MockedGameRoomModel.getAllRooms.mockReturnValue([]);

      disconnectHandler();

      // Should not crash and should not call getAllRooms when no player is mapped
      expect(MockedGameRoomModel.getAllRooms).not.toHaveBeenCalled();
    });

    it("should clean up player mappings when player exists", () => {
      // First simulate a join to create player mapping
      const joinRoomHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === "join-room"
      )![1];

      const mockPlayer = createMockPlayer(
        "test-player-id",
        "Test Player",
        "socket123"
      );
      const mockRoom = createMockRoom("room123", [mockPlayer]);

      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(true);
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);
      MockedGameService.initializeBoard.mockReturnValue(
        Array(10)
          .fill(null)
          .map(() => Array(10).fill(null))
      );

      // Join room to create player mapping
      joinRoomHandler({
        roomId: "room123",
        playerName: "Test Player",
      });

      // Now test disconnect
      MockedGameRoomModel.getAllRooms.mockReturnValue([mockRoom]);
      MockedGameRoomModel.removePlayerFromRoom.mockReturnValue(true);

      disconnectHandler();

      // Should call getAllRooms and removePlayerFromRoom
      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalled();
      expect(MockedGameRoomModel.removePlayerFromRoom).toHaveBeenCalledWith(
        "room123",
        "test-player-id"
      );
    });
  });

  describe("error handling", () => {
    it("should set up error handler", () => {
      handler.handleConnection(mockSocket as Socket);

      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const errorCall = onCalls.find(
        (call: [string, Function]) => call[0] === "error"
      );

      expect(errorCall).toBeDefined();
    });
  });
});
