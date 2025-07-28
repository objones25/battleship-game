import { Server } from "socket.io";
import { createServer } from "http";
import { Socket } from "socket.io";
import { GameSocketHandler } from "../../src/sockets/GameSocketHandler";
import { GameRoomModel } from "../../src/models/GameRoom";
import { GameService } from "../../src/services/GameService";
import { AuthService } from "../../src/services/AuthService";
import { Ship, Player, GameRoom, User } from "../../src/types";

// Mock the dependencies
jest.mock("../../src/models/GameRoom");
jest.mock("../../src/services/GameService");
jest.mock("../../src/services/AuthService");
jest.mock("../../src/services/UserService");
jest.mock("../../src/utils", () => ({
  Utils: {
    generatePlayerId: jest.fn(() => "test-player-id"),
    generateRoomId: jest.fn(() => "test-room-id"),
  },
}));

const MockedGameRoomModel = GameRoomModel as jest.Mocked<typeof GameRoomModel>;
const MockedGameService = GameService as jest.Mocked<typeof GameService>;
const MockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe("GameSocketHandler", () => {
  let io: Server;
  let handler: GameSocketHandler;
  let mockSocket: Partial<Socket>;
  let httpServer: ReturnType<typeof createServer>;

  const mockUser: User = {
    id: "test-user-id",
    username: "testuser",
    email: "test@example.com",
    passwordHash: "hashedpassword",
    createdAt: new Date(),
    lastActive: new Date(),
  };

  const createMockPlayer = (
    id: string,
    name: string,
    socketId: string
  ): Player => ({
    id,
    userId: "test-user-id",
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
      handshake: {
        headers: {
          cookie: "authToken=valid-jwt-token",
        },
      } as any,
    };

    // Mock io.to method
    io.to = jest.fn().mockReturnValue({
      emit: jest.fn(),
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default auth mocks
    MockedAuthService.verifyToken.mockResolvedValue(mockUser);
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
        "authenticate",
        expect.any(Function)
      );
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

  describe("authenticate event", () => {
    let authenticateHandler: Function;

    beforeEach(() => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const authenticateCall = onCalls.find(
        (call: [string, Function]) => call[0] === "authenticate"
      );
      authenticateHandler = authenticateCall![1];
    });

    it("should successfully authenticate with valid token", async () => {
      await authenticateHandler({ token: "from-cookie" });

      expect(MockedAuthService.verifyToken).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith("authenticated", {
        success: true,
        user: { ...mockUser, passwordHash: undefined },
      });
    });

    it("should fail authentication with invalid token", async () => {
      MockedAuthService.verifyToken.mockRejectedValue(
        new Error("Invalid token")
      );

      await authenticateHandler({ token: "from-cookie" });

      expect(mockSocket.emit).toHaveBeenCalledWith("authenticated", {
        success: false,
        error: "Authentication failed",
      });
    });

    it("should fail authentication when token is null", async () => {
      MockedAuthService.verifyToken.mockResolvedValue(null);

      await authenticateHandler({ token: "from-cookie" });

      expect(mockSocket.emit).toHaveBeenCalledWith("authenticated", {
        success: false,
        error: "Invalid or expired token",
      });
    });
  });

  describe("join-room event", () => {
    let joinRoomHandler: Function;
    let authenticateHandler: Function;

    beforeEach(async () => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;

      const authenticateCall = onCalls.find(
        (call: [string, Function]) => call[0] === "authenticate"
      );
      authenticateHandler = authenticateCall![1];

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

      // Authenticate the socket first
      await authenticateHandler({ token: "from-cookie" });

      // Mock UserService methods that are called during join-room
      const MockedUserService = require("../../src/services/UserService")
        .UserService as jest.Mocked<
        typeof import("../../src/services/UserService").UserService
      >;
      MockedUserService.updateUserGameState = jest
        .fn()
        .mockResolvedValue(undefined);

      jest.clearAllMocks(); // Clear authentication call mocks
    });

    it("should successfully join a room when authenticated", async () => {
      const mockPlayer = createMockPlayer(
        "test-player-id",
        "testuser",
        "socket123"
      );
      const mockRoom = createMockRoom("room123", [mockPlayer]);

      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(true);
      MockedGameRoomModel.getRoom.mockReturnValue(mockRoom);

      await joinRoomHandler({ roomId: "room123" });

      expect(MockedGameRoomModel.addPlayerToRoom).toHaveBeenCalledWith(
        "room123",
        expect.objectContaining({
          id: "test-player-id",
          userId: "test-user-id",
          name: "testuser",
          socketId: "socket123",
        })
      );
      expect(mockSocket.join).toHaveBeenCalledWith("room123");
      expect(mockSocket.emit).toHaveBeenCalledWith("joined-room", {
        success: true,
        playerId: "test-player-id",
        room: mockRoom,
      });
    });

    it("should fail to join room when not authenticated", () => {
      // Create a new socket without authentication
      const newMockSocket = {
        id: "socket456",
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        on: jest.fn(),
      };

      // Create a new handler without authentication
      const newHandler = new GameSocketHandler(io);
      newHandler.handleConnection(newMockSocket as unknown as Socket);

      const onCalls = (newMockSocket.on as jest.Mock).mock.calls;
      const newJoinRoomCall = onCalls.find(
        (call: [string, Function]) => call[0] === "join-room"
      );
      const newJoinRoomHandler = newJoinRoomCall![1];

      newJoinRoomHandler({ roomId: "room123" });

      expect(newMockSocket.emit).toHaveBeenCalledWith("joined-room", {
        success: false,
        error: "Authentication required",
      });
    });

    it("should handle failed room join", () => {
      MockedGameRoomModel.addPlayerToRoom.mockReturnValue(false);

      joinRoomHandler({ roomId: "room123" });

      expect(mockSocket.emit).toHaveBeenCalledWith("joined-room", {
        success: false,
        error: "Could not join room",
      });
    });
  });

  describe("place-ships event", () => {
    let authenticateHandler: Function;
    let mockShips: Ship[];

    beforeEach(async () => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;

      const authenticateCall = onCalls.find(
        (call: [string, Function]) => call[0] === "authenticate"
      );
      authenticateHandler = authenticateCall![1];

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

      // Authenticate the socket first
      await authenticateHandler({ token: "from-cookie" });
      jest.clearAllMocks(); // Clear authentication call mocks
    });

    it("should require authentication", () => {
      // Create a new socket without authentication
      const newMockSocket = {
        id: "socket456",
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        on: jest.fn(),
      };

      // Create a new handler without authentication
      const newHandler = new GameSocketHandler(io);
      newHandler.handleConnection(newMockSocket as unknown as Socket);

      const onCalls = (newMockSocket.on as jest.Mock).mock.calls;
      const newPlaceShipsCall = onCalls.find(
        (call: [string, Function]) => call[0] === "place-ships"
      );
      const newPlaceShipsHandler = newPlaceShipsCall![1];

      newPlaceShipsHandler({
        roomId: "room123",
        ships: mockShips,
      });

      expect(newMockSocket.emit).toHaveBeenCalledWith("ships-placed", {
        success: false,
        error: "Authentication required",
      });
    });
  });

  describe("disconnect event", () => {
    let disconnectHandler: Function;
    let authenticateHandler: Function;

    beforeEach(async () => {
      handler.handleConnection(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;

      const authenticateCall = onCalls.find(
        (call: [string, Function]) => call[0] === "authenticate"
      );
      authenticateHandler = authenticateCall![1];

      const disconnectCall = onCalls.find(
        (call: [string, Function]) => call[0] === "disconnect"
      );
      disconnectHandler = disconnectCall![1];

      // Authenticate the socket first
      await authenticateHandler({ token: "from-cookie" });
      jest.clearAllMocks(); // Clear authentication call mocks
    });

    it("should handle disconnect gracefully when no user is mapped", () => {
      MockedGameRoomModel.getAllRooms.mockReturnValue([]);

      disconnectHandler();

      // Should not crash and should handle gracefully
      expect(MockedGameRoomModel.getAllRooms).toHaveBeenCalled();
    });

    it("should clean up user mappings when user exists", () => {
      const mockPlayer = createMockPlayer(
        "test-player-id",
        "testuser",
        "socket123"
      );
      const mockRoom = createMockRoom("room123", [mockPlayer]);

      MockedGameRoomModel.getAllRooms.mockReturnValue([mockRoom]);
      MockedGameRoomModel.removePlayerFromRoom.mockReturnValue(true);

      disconnectHandler();

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
