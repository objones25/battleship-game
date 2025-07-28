import { Request, Response } from "express";
import { GameRoomModel } from "../models/GameRoom";
import { GameStats } from "../types";

export class RoomController {
  static getStatus(_: Request, res: Response): void {
    // Get all rooms and calculate stats
    const allRooms = GameRoomModel.getAllRooms();

    // Count active rooms (not finished)
    const activeRooms = allRooms.filter(
      (room) => room.gameState !== "finished"
    ).length;

    // Count total active players across all rooms
    const activePlayers = allRooms.reduce(
      (total, room) => total + room.players.length,
      0
    );

    const stats: GameStats = {
      activeRooms,
      activePlayers,
      uptime: process.uptime(),
    };
    res.json(stats);
  }

  static createRoom(_: Request, res: Response): void {
    try {
      const room = GameRoomModel.createRoom();

      // Return sanitized room data (no sensitive player information)
      const sanitizedRoom = {
        id: room.id,
        playerCount: room.players.length,
        gameState: room.gameState,
        createdAt: room.createdAt,
      };

      res.status(201).json(sanitizedRoom);
    } catch (error) {
      res.status(500).json({ error: "Failed to create room" });
    }
  }

  static getRoom(req: Request, res: Response): void {
    const { roomId } = req.params;

    try {
      const room = GameRoomModel.getRoom(roomId);

      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }

      // Return sanitized room data (no sensitive player information like ship positions)
      const sanitizedRoom = {
        id: room.id,
        playerCount: room.players.length,
        players: room.players.map((player) => ({
          id: player.id,
          name: player.name,
          isReady: player.isReady,
          // Don't expose ships, board, hits, misses
        })),
        gameState: room.gameState,
        currentTurn: room.currentTurn,
        winner: room.winner,
        createdAt: room.createdAt,
      };

      res.json(sanitizedRoom);
    } catch (error) {
      res.status(500).json({ error: "Failed to get room" });
    }
  }

  static joinRoom(req: Request, res: Response): void {
    const { roomId } = req.params;
    const { playerName } = req.body;

    // Validate input
    if (!roomId || typeof roomId !== "string") {
      res.status(400).json({ error: "Invalid room ID" });
      return;
    }

    if (
      !playerName ||
      typeof playerName !== "string" ||
      playerName.trim().length === 0
    ) {
      res.status(400).json({ error: "Player name is required" });
      return;
    }

    try {
      // Check if room exists
      const room = GameRoomModel.getRoom(roomId);
      if (!room) {
        res.status(404).json({ error: "Room not found" });
        return;
      }

      // Create player object
      const player = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: playerName.trim(),
        socketId: "", // Will be set when player connects via socket
        isReady: false,
        ships: [],
        board: Array(10)
          .fill(null)
          .map(() => Array(10).fill(null)),
        hits: Array(10)
          .fill(false)
          .map(() => Array(10).fill(false)),
        misses: Array(10)
          .fill(false)
          .map(() => Array(10).fill(false)),
      };

      // Try to add player to room
      const success = GameRoomModel.addPlayerToRoom(roomId, player);

      if (!success) {
        res.status(400).json({
          error:
            "Unable to join room (room may be full or player already exists)",
        });
        return;
      }

      // Return sanitized success response
      res.status(200).json({
        message: "Successfully joined room",
        playerId: player.id,
        roomId: roomId,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to join room" });
    }
  }

  static listRooms(req: Request, res: Response): void {
    try {
      // Extract and validate query parameters
      const { gameState, excludeFull, maxPlayers } = req.query;

      // Build filter options
      const filters: {
        gameState?: "waiting" | "setup" | "playing" | "finished";
        excludeFull?: boolean;
        maxPlayers?: number;
      } = {};

      if (gameState && typeof gameState === "string") {
        // Validate gameState is one of the allowed values
        if (
          gameState === "waiting" ||
          gameState === "setup" ||
          gameState === "playing" ||
          gameState === "finished"
        ) {
          filters.gameState = gameState;
        }
      }

      if (excludeFull === "true") {
        filters.excludeFull = true;
      }

      if (maxPlayers && typeof maxPlayers === "string") {
        const maxPlayersNum = parseInt(maxPlayers, 10);
        if (!isNaN(maxPlayersNum) && maxPlayersNum > 0) {
          filters.maxPlayers = maxPlayersNum;
        }
      }

      // Get filtered rooms
      const rooms = GameRoomModel.getAllRooms(filters);

      // Return sanitized room list
      const sanitizedRooms = rooms.map((room) => ({
        id: room.id,
        playerCount: room.players.length,
        gameState: room.gameState,
        createdAt: room.createdAt,
        // Don't expose player details or sensitive information
      }));

      res.json({
        rooms: sanitizedRooms,
        total: sanitizedRooms.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to list rooms" });
    }
  }

  static cleanupRooms(req: Request, res: Response): void {
    try {
      // Extract cleanup options from query parameters
      const { emptyRoomTimeout, finishedGameTimeout, inactiveRoomTimeout } =
        req.query;

      const options: {
        emptyRoomTimeout?: number;
        finishedGameTimeout?: number;
        inactiveRoomTimeout?: number;
      } = {};

      if (emptyRoomTimeout && typeof emptyRoomTimeout === "string") {
        const timeout = parseInt(emptyRoomTimeout, 10);
        if (!isNaN(timeout) && timeout > 0) {
          options.emptyRoomTimeout = timeout;
        }
      }

      if (finishedGameTimeout && typeof finishedGameTimeout === "string") {
        const timeout = parseInt(finishedGameTimeout, 10);
        if (!isNaN(timeout) && timeout > 0) {
          options.finishedGameTimeout = timeout;
        }
      }

      if (inactiveRoomTimeout && typeof inactiveRoomTimeout === "string") {
        const timeout = parseInt(inactiveRoomTimeout, 10);
        if (!isNaN(timeout) && timeout > 0) {
          options.inactiveRoomTimeout = timeout;
        }
      }

      // Perform cleanup
      const cleanupResult = GameRoomModel.cleanupRooms(options);

      res.json({
        message: "Room cleanup completed",
        ...cleanupResult,
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup rooms" });
    }
  }
}
