import { GameRoom, Player } from "../types";
import { Utils } from "../utils";

export class GameRoomModel {
  private static rooms = new Map<string, GameRoom>();

  static createRoom(): GameRoom {
    const uniqueId = Utils.generateRoomId();
    let newRoom: GameRoom = {
      id: uniqueId,
      players: [],
      currentTurn: null,
      gameState: "waiting",
      winner: null,
      createdAt: new Date(),
    };
    this.rooms.set(uniqueId, newRoom);
    return newRoom;
  }

  static getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  static addPlayerToRoom(roomId: string, player: Player): boolean {
    let room = this.getRoom(roomId);
    if (!room) return false;
    if (room.players.length >= 2) return false;
    if (room.players.find((p) => p.id === player.id)) return false;
    room.players.push(player);

    // Automatically transition to setup when 2 players join
    if (room.players.length === 2 && room.gameState === "waiting") {
      room.gameState = "setup";
    }

    this.rooms.set(roomId, room);
    return true;
  }

  static removePlayerFromRoom(roomId: string, playerId: string): boolean {
    let room = this.getRoom(roomId);
    if (!room) return false;
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return false;
    room.players.splice(playerIndex, 1);
    // Reset game state if needed
    if (room.gameState !== "waiting") {
      room.gameState = "waiting";
      room.currentTurn = null;
      room.winner = null;
    }
    this.rooms.set(roomId, room);
    return true;
  }

  static getAllRooms(filters?: {
    gameState?: "waiting" | "setup" | "playing" | "finished";
    excludeFull?: boolean;
    maxPlayers?: number;
    sortBy?: "createdAt" | "playerCount";
    sortOrder?: "asc" | "desc";
  }): GameRoom[] {
    const rooms = Array.from(this.rooms.values())
      .filter((room) => {
        if (filters?.gameState && room.gameState !== filters.gameState) {
          return false;
        }
        if (filters?.excludeFull && room.players.length === 2) {
          return false;
        }
        if (filters?.maxPlayers && room.players.length > filters.maxPlayers) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (filters?.sortBy === "createdAt") {
          return filters.sortOrder === "asc"
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime();
        } else if (filters?.sortBy === "playerCount") {
          return filters.sortOrder === "asc"
            ? a.players.length - b.players.length
            : b.players.length - a.players.length;
        }
        return 0;
      });
    return rooms;
  }

  static deleteRoom(id: string): boolean {
    const room = this.getRoom(id);
    if (!room) return false;

    // Log room deletion for monitoring
    console.log(`Deleting room ${id} with ${room.players.length} players`);

    // TODO: Clear any timers associated with the room
    // TODO: Notify any connected players (handled by socket layer)

    return this.rooms.delete(id);
  }

  static cleanupRooms(options?: {
    emptyRoomTimeout?: number; // minutes
    finishedGameTimeout?: number; // minutes
    inactiveRoomTimeout?: number; // minutes
  }): {
    emptyRoomsRemoved: number;
    finishedGamesRemoved: number;
    inactiveRoomsRemoved: number;
    totalRoomsRemaining: number;
  } {
    const {
      emptyRoomTimeout = 30, // 30 minutes for empty rooms
      finishedGameTimeout = 60, // 1 hour for finished games
      inactiveRoomTimeout = 120, // 2 hours for inactive rooms
    } = options || {};

    const now = new Date();
    let emptyRoomsRemoved = 0;
    let finishedGamesRemoved = 0;
    let inactiveRoomsRemoved = 0;

    const allRooms = this.getAllRooms();

    console.log(`🧹 Starting room cleanup - checking ${allRooms.length} rooms`);
    console.log(
      `🔧 Cleanup thresholds: empty=${emptyRoomTimeout}min, finished=${finishedGameTimeout}min, inactive=${inactiveRoomTimeout}min`
    );

    for (const room of allRooms) {
      const roomAge = now.getTime() - room.createdAt.getTime();
      const roomAgeMinutes = roomAge / (1000 * 60);

      console.log(
        `🔍 Room ${room.id}: players=${room.players.length}, state=${
          room.gameState
        }, age=${Math.round(roomAgeMinutes * 100) / 100}min`
      );

      // Priority 1: Remove finished games after timeout (most specific)
      if (
        room.gameState === "finished" &&
        roomAgeMinutes >= finishedGameTimeout
      ) {
        this.deleteRoom(room.id);
        finishedGamesRemoved++;
        console.log(
          `🏁 Removed finished game ${room.id} (age: ${Math.round(
            roomAgeMinutes
          )}min)`
        );
        continue;
      }

      // Priority 2: Remove inactive rooms (waiting/setup states only, but only if empty)
      if (
        (room.gameState === "waiting" || room.gameState === "setup") &&
        room.players.length === 0 &&
        roomAgeMinutes >= inactiveRoomTimeout
      ) {
        this.deleteRoom(room.id);
        inactiveRoomsRemoved++;
        console.log(
          `⏰ Removed inactive room ${room.id} (age: ${Math.round(
            roomAgeMinutes
          )}min, state: ${room.gameState})`
        );
        continue;
      }

      // Priority 3: Remove empty rooms (any state except finished, but only if not already handled above)
      if (
        room.players.length === 0 &&
        room.gameState !== "finished" && // Don't double-count finished rooms
        roomAgeMinutes >= emptyRoomTimeout
      ) {
        this.deleteRoom(room.id);
        emptyRoomsRemoved++;
        console.log(
          `🗑️  Removed empty room ${room.id} (age: ${Math.round(
            roomAgeMinutes
          )}min)`
        );
        continue;
      }
    }

    const totalRoomsRemaining = this.getAllRooms().length;
    const totalRemoved =
      emptyRoomsRemoved + finishedGamesRemoved + inactiveRoomsRemoved;

    if (totalRemoved > 0) {
      console.log(
        `✅ Cleanup complete: removed ${totalRemoved} rooms, ${totalRoomsRemaining} remaining`
      );
    } else {
      console.log(
        `✅ Cleanup complete: no rooms needed cleanup, ${totalRoomsRemaining} remaining`
      );
    }

    return {
      emptyRoomsRemoved,
      finishedGamesRemoved,
      inactiveRoomsRemoved,
      totalRoomsRemaining,
    };
  }
}
