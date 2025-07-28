import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";
import { GameRoomModel } from "../models/GameRoom";
import { Utils } from "../utils";
import { Player, Ship } from "../types";

export class GameSocketHandler {
  private io: Server;
  private playerSockets = new Map<string, string>(); // socketId -> playerId
  private socketPlayers = new Map<string, string>(); // playerId -> socketId
  private cleanupTimers = new Set<NodeJS.Timeout>(); // Track cleanup timers

  constructor(io: Server) {
    this.io = io;
  }

  // Method to clear all timers (useful for testing)
  clearAllTimers(): void {
    this.cleanupTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.cleanupTimers.clear();
  }

  handleConnection(socket: Socket): void {
    console.log(`User connected: ${socket.id}`);

    // Player joins a room
    socket.on("join-room", (data: { roomId: string; playerName: string }) => {
      try {
        const { roomId, playerName } = data;

        // Create new player
        const player: Player = {
          id: Utils.generatePlayerId(),
          name: playerName,
          socketId: socket.id,
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

        // Add player to room
        const success = GameRoomModel.addPlayerToRoom(roomId, player);

        if (success) {
          // Join socket room
          socket.join(roomId);

          // Store player mappings
          this.playerSockets.set(socket.id, player.id);
          this.socketPlayers.set(player.id, socket.id);

          const room = GameRoomModel.getRoom(roomId);

          // Notify player of successful join
          socket.emit("joined-room", {
            success: true,
            playerId: player.id,
            room,
          });

          // Notify other players in room
          socket.to(roomId).emit("player-joined", {
            player: { id: player.id, name: player.name },
            room,
          });

          console.log(`Player ${playerName} joined room ${roomId}`);
        } else {
          socket.emit("joined-room", {
            success: false,
            error: "Could not join room",
          });
        }
      } catch (error) {
        socket.emit("joined-room", {
          success: false,
          error: "Server error",
        });
        console.error("Join room error:", error);
      }
    });

    // Player leaves a room
    socket.on("leave-room", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const playerId = this.playerSockets.get(socket.id);

        if (playerId) {
          const success = GameRoomModel.removePlayerFromRoom(roomId, playerId);

          if (success) {
            socket.leave(roomId);
            this.playerSockets.delete(socket.id);
            this.socketPlayers.delete(playerId);

            // Notify other players
            socket.to(roomId).emit("player-left", { playerId });

            console.log(`Player ${playerId} left room ${roomId}`);
          }
        }
      } catch (error) {
        console.error("Leave room error:", error);
      }
    });

    // Player places ships on board
    socket.on("place-ships", (data: { roomId: string; ships: Ship[] }) => {
      try {
        const { roomId, ships } = data;
        const playerId = this.playerSockets.get(socket.id);

        if (!playerId) {
          socket.emit("ships-placed", {
            success: false,
            error: "Player not found",
          });
          return;
        }

        // Validate ship placement
        if (!GameService.validateShipPlacement(ships)) {
          socket.emit("ships-placed", {
            success: false,
            error: "Invalid ship placement",
          });
          return;
        }

        const room = GameRoomModel.getRoom(roomId);
        if (!room) {
          socket.emit("ships-placed", {
            success: false,
            error: "Room not found",
          });
          return;
        }

        // Update player's ships
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          player.ships = ships;
          socket.emit("ships-placed", { success: true });

          // Notify other players that ships are placed (without revealing positions)
          socket.to(roomId).emit("opponent-ships-placed", { playerId });

          console.log(`Ships placed by player ${playerId} in room ${roomId}`);
        }
      } catch (error) {
        socket.emit("ships-placed", { success: false, error: "Server error" });
        console.error("Place ships error:", error);
      }
    });

    // Player marks ready status
    socket.on("player-ready", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const playerId = this.playerSockets.get(socket.id);

        if (!playerId) return;

        const room = GameRoomModel.getRoom(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          player.isReady = true;

          // Check if both players are ready
          const allReady =
            room.players.length === 2 &&
            room.players.every((p) => p.isReady && p.ships.length > 0);

          if (allReady) {
            room.gameState = "playing";
            room.currentTurn = room.players[0].id; // First player starts

            // Notify all players game is starting
            this.io.to(roomId).emit("game-started", {
              room,
              currentTurn: room.currentTurn,
            });
          } else {
            // Notify room of ready status
            this.io.to(roomId).emit("player-ready-status", {
              playerId,
              isReady: true,
              room,
            });
          }

          console.log(`Player ${playerId} ready in room ${roomId}`);
        }
      } catch (error) {
        console.error("Player ready error:", error);
      }
    });

    // Player makes a move (fires at opponent's board)
    socket.on("make-move", (data: { roomId: string; x: number; y: number }) => {
      try {
        const { roomId, x, y } = data;
        const playerId = this.playerSockets.get(socket.id);

        if (!playerId) return;

        const room = GameRoomModel.getRoom(roomId);
        if (
          !room ||
          room.gameState !== "playing" ||
          room.currentTurn !== playerId
        ) {
          socket.emit("move-result", { success: false, error: "Invalid move" });
          return;
        }

        // Find opponent and attacker
        const opponent = room.players.find((p) => p.id !== playerId);
        const attacker = room.players.find((p) => p.id === playerId);
        if (!opponent || !attacker) return;

        // Validate target - check if attacker has already targeted this position
        const alreadyTargeted =
          (attacker.hits[x] && attacker.hits[x][y]) ||
          (attacker.misses[x] && attacker.misses[x][y]);
        if (alreadyTargeted) {
          socket.emit("move-result", {
            success: false,
            error: "Position already targeted",
          });
          return;
        }

        // Validate coordinates are within bounds
        if (x < 0 || x >= 10 || y < 0 || y >= 10) {
          socket.emit("move-result", {
            success: false,
            error: "Invalid coordinates",
          });
          return;
        }

        // Process move
        const moveResult = GameService.processMove(
          opponent.board,
          opponent.ships,
          x,
          y
        );

        // Update the attacker's tracking of where they've attacked the opponent
        if (moveResult.hit) {
          attacker.hits[x][y] = true;
        } else {
          attacker.misses[x][y] = true;
        }

        // Check for game end
        if (moveResult.gameEnded) {
          room.gameState = "finished";
          room.winner = playerId;
        } else {
          // Switch turns
          room.currentTurn = opponent.id;
        }

        // Notify all players of move result with updated room state
        this.io.to(roomId).emit("move-result", {
          success: true,
          playerId,
          x,
          y,
          hit: moveResult.hit,
          shipDestroyed: moveResult.shipDestroyed,
          gameEnded: moveResult.gameEnded,
          winner: moveResult.winner,
          currentTurn: room.currentTurn,
          room: room, // Send the complete updated room state
        });

        console.log(
          `Move made by ${playerId} in room ${roomId}: (${x}, ${y}) - ${
            moveResult.hit ? "HIT" : "MISS"
          }`
        );
      } catch (error) {
        socket.emit("move-result", { success: false, error: "Server error" });
        console.error("Make move error:", error);
      }
    });

    // Player sends chat message
    socket.on("chat-message", (data: { roomId: string; message: string }) => {
      try {
        const { roomId, message } = data;
        const playerId = this.playerSockets.get(socket.id);

        if (!playerId) return;

        const room = GameRoomModel.getRoom(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          // Broadcast message to room
          this.io.to(roomId).emit("chat-message", {
            playerId,
            playerName: player.name,
            message,
            timestamp: new Date(),
          });

          console.log(
            `Chat message from ${player.name} in room ${roomId}: ${message}`
          );
        }
      } catch (error) {
        console.error("Chat message error:", error);
      }
    });

    // Player requests game restart
    socket.on("restart-game", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const playerId = this.playerSockets.get(socket.id);

        if (!playerId) return;

        const room = GameRoomModel.getRoom(roomId);
        if (!room) return;

        // Reset room state
        room.gameState = "setup";
        room.currentTurn = null;
        room.winner = null;

        // Reset all players
        room.players.forEach((player) => {
          player.isReady = false;
          player.board = GameService.initializeBoard();
          player.ships = [];
          player.hits = Array(10)
            .fill(null)
            .map(() => Array(10).fill(false));
          player.misses = Array(10)
            .fill(null)
            .map(() => Array(10).fill(false));
        });

        // Notify all players
        this.io.to(roomId).emit("game-restarted", { room });

        console.log(`Game restarted in room ${roomId}`);
      } catch (error) {
        console.error("Restart game error:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      try {
        const playerId = this.playerSockets.get(socket.id);

        if (playerId) {
          // Find and leave all rooms this player was in
          const rooms = GameRoomModel.getAllRooms();
          rooms.forEach((room) => {
            const playerInRoom = room.players.find((p) => p.id === playerId);
            if (playerInRoom) {
              GameRoomModel.removePlayerFromRoom(room.id, playerId);
              socket.to(room.id).emit("player-disconnected", { playerId });
            }
          });

          // Clean up mappings
          this.playerSockets.delete(socket.id);
          this.socketPlayers.delete(playerId);

          // Trigger immediate cleanup for empty rooms
          const cleanupTimer = setTimeout(() => {
            try {
              GameRoomModel.cleanupRooms({ emptyRoomTimeout: 0 }); // Clean empty rooms immediately
            } catch (error) {
              console.error("Immediate cleanup error:", error);
            }
            // Remove timer from tracking set when it completes
            this.cleanupTimers.delete(cleanupTimer);
          }, 1000); // Small delay to ensure all disconnect processing is complete

          // Track the timer so it can be cleared if needed
          this.cleanupTimers.add(cleanupTimer);
        }
      } catch (error) {
        console.error("Disconnect cleanup error:", error);
      }
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  }
}
