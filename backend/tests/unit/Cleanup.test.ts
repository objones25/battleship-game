import { Utils } from "../../src/utils";
import { GameRoomModel } from "../../src/models/GameRoom";
import { GameService } from "../../src/services/GameService";

describe("GameRoomModel.cleanupRooms", () => {
  beforeEach(() => {
    // Clear all rooms before each test
    const allRooms = GameRoomModel.getAllRooms();
    allRooms.forEach((room) => {
      GameRoomModel.deleteRoom(room.id);
    });
  });

  afterEach(() => {
    // Clean up after each test
    const allRooms = GameRoomModel.getAllRooms();
    allRooms.forEach((room) => {
      GameRoomModel.deleteRoom(room.id);
    });
  });

  describe("Empty Room Cleanup", () => {
    it("should remove empty rooms when emptyRoomTimeout=0", () => {
      // Create an empty room
      GameRoomModel.createRoom();
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);

      // Run cleanup with 0 timeout
      const result = GameRoomModel.cleanupRooms({ emptyRoomTimeout: 0 });

      // Should remove the empty room
      expect(result.emptyRoomsRemoved).toBe(1);
      expect(result.totalRoomsRemaining).toBe(0);
      expect(GameRoomModel.getAllRooms()).toHaveLength(0);
    });

    it("should NOT remove empty rooms when age < timeout", () => {
      // Create an empty room
      GameRoomModel.createRoom();
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);

      // Run cleanup with 30 minute timeout (room is brand new)
      const result = GameRoomModel.cleanupRooms({ emptyRoomTimeout: 30 });

      // Should NOT remove the room
      expect(result.emptyRoomsRemoved).toBe(0);
      expect(result.totalRoomsRemaining).toBe(1);
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);
    });

    it("should NOT remove rooms with players", () => {
      // Create a room and add a player
      const room = GameRoomModel.createRoom();
      const player = {
        id: "player1",
        userId: "test_user_1",
        name: "Player 1",
        socketId: "socket1",
        isReady: false,
        board: GameService.initializeBoard(),
        ships: [],
        hits: Array(10)
          .fill(null)
          .map(() => Array(10).fill(false)),
        misses: Array(10)
          .fill(null)
          .map(() => Array(10).fill(false)),
      };
      GameRoomModel.addPlayerToRoom(room.id, player);

      // Run cleanup with 0 timeout
      const result = GameRoomModel.cleanupRooms({ emptyRoomTimeout: 0 });

      // Should NOT remove the room with a player
      expect(result.emptyRoomsRemoved).toBe(0);
      expect(result.totalRoomsRemaining).toBe(1);
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);
    });
  });

  describe("Finished Game Cleanup", () => {
    it("should remove finished games when finishedGameTimeout=0", () => {
      // Create a room and set it to finished
      const room = GameRoomModel.createRoom();
      room.gameState = "finished";
      room.winner = "player1";

      // Run cleanup with 0 timeout
      const result = GameRoomModel.cleanupRooms({ finishedGameTimeout: 0 });

      // Should remove the finished game
      expect(result.finishedGamesRemoved).toBe(1);
      expect(result.totalRoomsRemaining).toBe(0);
      expect(GameRoomModel.getAllRooms()).toHaveLength(0);
    });

    it("should NOT remove finished games when age < timeout", () => {
      // Create a room and set it to finished
      const room = GameRoomModel.createRoom();
      room.gameState = "finished";
      room.winner = "player1";

      // Run cleanup with 60 minute timeout
      const result = GameRoomModel.cleanupRooms({ finishedGameTimeout: 60 });

      // Should NOT remove the finished game
      expect(result.finishedGamesRemoved).toBe(0);
      expect(result.totalRoomsRemaining).toBe(1);
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);
    });
  });

  describe("Inactive Room Cleanup", () => {
    it("should remove inactive waiting rooms when inactiveRoomTimeout=0", () => {
      // Create a room in waiting state
      const room = GameRoomModel.createRoom();
      expect(room.gameState).toBe("waiting");

      // Run cleanup with 0 timeout
      const result = GameRoomModel.cleanupRooms({ inactiveRoomTimeout: 0 });

      // Should remove the inactive room
      expect(result.inactiveRoomsRemoved).toBe(1);
      expect(result.totalRoomsRemaining).toBe(0);
      expect(GameRoomModel.getAllRooms()).toHaveLength(0);
    });

    it("should remove inactive setup rooms when inactiveRoomTimeout=0", () => {
      // Create a room and set it to setup state
      const room = GameRoomModel.createRoom();
      room.gameState = "setup";

      // Run cleanup with 0 timeout
      const result = GameRoomModel.cleanupRooms({ inactiveRoomTimeout: 0 });

      // Should remove the inactive room
      expect(result.inactiveRoomsRemoved).toBe(1);
      expect(result.totalRoomsRemaining).toBe(0);
      expect(GameRoomModel.getAllRooms()).toHaveLength(0);
    });

    it("should NOT remove playing rooms", () => {
      // Create a room and set it to playing state
      const room = GameRoomModel.createRoom();
      room.gameState = "playing";

      // Run cleanup with 0 timeout
      const result = GameRoomModel.cleanupRooms({ inactiveRoomTimeout: 0 });

      // Should NOT remove the playing room
      expect(result.inactiveRoomsRemoved).toBe(0);
      expect(result.totalRoomsRemaining).toBe(1);
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);
    });
  });

  describe("Mixed Scenarios", () => {
    it("should handle multiple room types correctly", () => {
      // Create different types of rooms
      GameRoomModel.createRoom();

      const finishedRoom = GameRoomModel.createRoom();
      finishedRoom.gameState = "finished";

      const playingRoom = GameRoomModel.createRoom();
      playingRoom.gameState = "playing";

      const roomWithPlayer = GameRoomModel.createRoom();
      const player = {
        id: Utils.generatePlayerId(),
        userId: "test_user_mixed",
        name: "TestPlayer",
        socketId: "socket123",
        isReady: false,
        board: GameService.initializeBoard(),
        ships: [],
        hits: Array(10)
          .fill(null)
          .map(() => Array(10).fill(false)),
        misses: Array(10)
          .fill(null)
          .map(() => Array(10).fill(false)),
      };
      GameRoomModel.addPlayerToRoom(roomWithPlayer.id, player);

      expect(GameRoomModel.getAllRooms()).toHaveLength(4);

      // Run cleanup with all timeouts = 0
      const result = GameRoomModel.cleanupRooms({
        emptyRoomTimeout: 0,
        finishedGameTimeout: 0,
        inactiveRoomTimeout: 0,
      });

      // Should remove: empty room as inactive, finished room as finished, playing room as empty
      // Keep: room with player
      expect(result.emptyRoomsRemoved).toBe(1); // Playing room (empty, not waiting/setup/finished)
      expect(result.finishedGamesRemoved).toBe(1); // Finished room
      expect(result.inactiveRoomsRemoved).toBe(1); // Empty room (waiting state)
      expect(result.totalRoomsRemaining).toBe(1); // Only room with player
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);
    });

    it("should return correct statistics", () => {
      // Create 3 empty rooms (all will be in "waiting" state by default)
      GameRoomModel.createRoom();
      GameRoomModel.createRoom();
      GameRoomModel.createRoom();

      expect(GameRoomModel.getAllRooms()).toHaveLength(3);

      // Run cleanup with inactive timeout = 0 (they're all in waiting state)
      const result = GameRoomModel.cleanupRooms({ inactiveRoomTimeout: 0 });

      // Check statistics - all should be removed as inactive rooms
      expect(result.emptyRoomsRemoved).toBe(0);
      expect(result.finishedGamesRemoved).toBe(0);
      expect(result.inactiveRoomsRemoved).toBe(3); // All are in waiting state
      expect(result.totalRoomsRemaining).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle no rooms gracefully", () => {
      expect(GameRoomModel.getAllRooms()).toHaveLength(0);

      const result = GameRoomModel.cleanupRooms({ emptyRoomTimeout: 0 });

      expect(result.emptyRoomsRemoved).toBe(0);
      expect(result.finishedGamesRemoved).toBe(0);
      expect(result.inactiveRoomsRemoved).toBe(0);
      expect(result.totalRoomsRemaining).toBe(0);
    });

    it("should use default timeouts when no options provided", () => {
      GameRoomModel.createRoom();

      // Run cleanup with no options (should use defaults)
      const result = GameRoomModel.cleanupRooms();

      // With default 30min timeout, new room should not be removed
      expect(result.emptyRoomsRemoved).toBe(0);
      expect(result.totalRoomsRemaining).toBe(1);
      expect(GameRoomModel.getAllRooms()).toHaveLength(1);
    });
  });
});
