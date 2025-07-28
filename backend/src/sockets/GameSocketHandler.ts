import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";
import { GameRoomModel } from "../models/GameRoom";
import { AuthService } from "../services/AuthService";
import { UserService } from "../services/UserService";
import { Utils } from "../utils";
import {
  Player,
  Ship,
  User,
  SocketAuthData,
  SocketAuthResponse,
} from "../types";

// Extend Socket interface to include user data
interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: Omit<User, "passwordHash">;
}

export class GameSocketHandler {
  private io: Server;
  private userSockets = new Map<string, string>(); // userId -> socketId
  private socketUsers = new Map<string, string>(); // socketId -> userId
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

  handleConnection(socket: AuthenticatedSocket): void {
    console.log(`Socket connected: ${socket.id}`);

    // First, require authentication
    socket.on("authenticate", async (_data: SocketAuthData) => {
      try {
        // Extract token from cookie instead of relying on client data
        const cookieHeader = socket.handshake.headers.cookie;
        console.log("=== SOCKET AUTH DEBUG ===");
        console.log("Cookie header:", cookieHeader);
        console.log("All headers:", socket.handshake.headers);
        console.log("Socket handshake auth:", socket.handshake.auth);

        let token: string | undefined;
        if (cookieHeader) {
          // Parse cookies more robustly
          const cookies = cookieHeader.split(";").map((c) => c.trim());
          console.log("Parsed cookies:", cookies);

          for (const cookie of cookies) {
            if (cookie.startsWith("auth_token=")) {
              // Extract token value and decode if necessary
              const tokenValue = cookie.substring("auth_token=".length);
              token = decodeURIComponent(tokenValue);
              console.log("Auth cookie found and extracted");
              break;
            }
          }

          if (!token) {
            console.log("Auth token not found in cookies");
          }
        } else {
          console.log("No cookie header found in socket handshake");
        }
        console.log("=== END DEBUG ===");

        if (!token) {
          const response: SocketAuthResponse = {
            success: false,
            error: "Authentication token not found in cookies",
          };
          socket.emit("authenticated", response);
          return;
        }

        // Verify token
        console.log("Attempting to verify token...");
        const user = await AuthService.verifyToken(token);
        console.log("Token verification result:", user ? "Success" : "Failed");

        if (!user) {
          const response: SocketAuthResponse = {
            success: false,
            error: "Invalid or expired token",
          };
          socket.emit("authenticated", response);
          return;
        }

        // Store user-socket mapping
        socket.userId = user.id;
        socket.user = { ...user, passwordHash: undefined } as Omit<
          User,
          "passwordHash"
        >;
        this.userSockets.set(user.id, socket.id);
        this.socketUsers.set(socket.id, user.id);

        // Attempt to restore user's game state
        await this.attemptUserReconnection(socket, user);

        const response: SocketAuthResponse = {
          success: true,
          user: socket.user,
        };
        socket.emit("authenticated", response);

        console.log(`User authenticated: ${user.username} (${user.id})`);
      } catch (error) {
        console.error("Authentication error:", error);
        const response: SocketAuthResponse = {
          success: false,
          error: "Authentication failed",
        };
        socket.emit("authenticated", response);
      }
    });

    // Player joins a room (requires authentication)
    socket.on("join-room", async (data: { roomId: string }) => {
      try {
        console.log(`=== JOIN ROOM DEBUG ===`);
        console.log(
          `Socket ${socket.id} attempting to join room ${data.roomId}`
        );
        console.log(`User authenticated:`, !!socket.userId, !!socket.user);

        if (!socket.userId || !socket.user) {
          console.log(`Join room failed: Authentication required`);
          socket.emit("joined-room", {
            success: false,
            error: "Authentication required",
          });
          return;
        }

        const { roomId } = data;
        const user = socket.user;

        console.log(
          `User ${user.username} (${user.id}) trying to join room ${roomId}`
        );

        // Check if room exists
        const existingRoom = GameRoomModel.getRoom(roomId);
        console.log(`Room ${roomId} exists:`, !!existingRoom);
        if (existingRoom) {
          console.log(`Room ${roomId} state:`, existingRoom.gameState);
          console.log(`Room ${roomId} players:`, existingRoom.players.length);
        }

        // Create new player with user data
        const player: Player = {
          id: Utils.generatePlayerId(),
          userId: user.id,
          name: user.username,
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

        console.log(`Created player:`, {
          id: player.id,
          name: player.name,
          userId: player.userId,
        });

        // Add player to room
        const success = GameRoomModel.addPlayerToRoom(roomId, player);
        console.log(`Add player to room result:`, success);

        if (success) {
          // Join socket room
          socket.join(roomId);
          console.log(`Socket ${socket.id} joined socket room ${roomId}`);

          const room = GameRoomModel.getRoom(roomId);
          console.log(`Retrieved room after join:`, !!room);
          if (room) {
            console.log(`Room players after join:`, room.players.length);
            console.log(`Room state after join:`, room.gameState);
          }

          // Update user's game state
          await UserService.updateUserGameState(user.id, {
            roomId,
            playerId: player.id,
            ships: [],
            isReady: false,
            gamePhase: "setup",
            lastActivity: new Date(),
          });
          console.log(`Updated user game state for ${user.id}`);

          // Notify player of successful join
          console.log(`Emitting joined-room success event to ${socket.id}`);
          socket.emit("joined-room", {
            success: true,
            playerId: player.id,
            room,
          });

          // Notify other players in room
          console.log(`Emitting player-joined event to room ${roomId}`);
          socket.to(roomId).emit("player-joined", {
            player: { id: player.id, name: player.name },
            room,
          });

          console.log(
            `User ${user.username} successfully joined room ${roomId}`
          );
        } else {
          console.log(`Failed to add player to room ${roomId}`);
          socket.emit("joined-room", {
            success: false,
            error: "Could not join room",
          });
        }
        console.log(`=== END JOIN ROOM DEBUG ===`);
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("joined-room", {
          success: false,
          error: "Server error",
        });
      }
    });

    // Player leaves a room
    socket.on("leave-room", async (data: { roomId: string }) => {
      try {
        if (!socket.userId) return;

        const { roomId } = data;
        const room = GameRoomModel.getRoom(roomId);

        if (room) {
          const player = room.players.find((p) => p.userId === socket.userId);
          if (player) {
            const success = GameRoomModel.removePlayerFromRoom(
              roomId,
              player.id
            );

            if (success) {
              socket.leave(roomId);

              // Clear user's game state
              await UserService.clearUserGameState(socket.userId);

              // Notify other players
              socket.to(roomId).emit("player-left", { playerId: player.id });

              console.log(`User ${socket.userId} left room ${roomId}`);
            }
          }
        }
      } catch (error) {
        console.error("Leave room error:", error);
      }
    });

    // Player places ships on board
    socket.on(
      "place-ships",
      async (data: { roomId: string; ships: Ship[] }) => {
        try {
          if (!socket.userId) {
            socket.emit("ships-placed", {
              success: false,
              error: "Authentication required",
            });
            return;
          }

          const { roomId, ships } = data;

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

          // Find player by userId
          const player = room.players.find((p) => p.userId === socket.userId);
          if (player) {
            player.ships = ships;
            socket.emit("ships-placed", { success: true });

            // Update user's game state
            await UserService.updateUserGameState(socket.userId, {
              roomId,
              playerId: player.id,
              ships,
              isReady: false,
              gamePhase: "setup",
              lastActivity: new Date(),
            });

            // Notify other players that ships are placed (without revealing positions)
            socket
              .to(roomId)
              .emit("opponent-ships-placed", { playerId: player.id });

            console.log(
              `Ships placed by user ${socket.userId} in room ${roomId}`
            );
          }
        } catch (error) {
          socket.emit("ships-placed", {
            success: false,
            error: "Server error",
          });
          console.error("Place ships error:", error);
        }
      }
    );

    // Player marks ready status
    socket.on("player-ready", async (data: { roomId: string }) => {
      try {
        if (!socket.userId) return;

        const { roomId } = data;
        const room = GameRoomModel.getRoom(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.userId === socket.userId);
        if (player) {
          player.isReady = true;

          // Update user's game state
          await UserService.updateUserGameState(socket.userId, {
            roomId,
            playerId: player.id,
            ships: player.ships,
            isReady: true,
            gamePhase: "setup",
            lastActivity: new Date(),
          });

          // Check if both players are ready
          const allReady =
            room.players.length === 2 &&
            room.players.every((p) => p.isReady && p.ships.length > 0);

          if (allReady) {
            room.gameState = "playing";
            room.currentTurn = room.players[0].id; // First player starts

            // Update both users' game states to playing
            for (const roomPlayer of room.players) {
              await UserService.updateUserGameState(roomPlayer.userId, {
                roomId,
                playerId: roomPlayer.id,
                ships: roomPlayer.ships,
                isReady: true,
                gamePhase: "playing",
                opponentId: room.players.find((p) => p.id !== roomPlayer.id)
                  ?.userId,
                lastActivity: new Date(),
              });
            }

            // Notify all players game is starting
            this.io.to(roomId).emit("game-started", {
              room,
              currentTurn: room.currentTurn,
            });
          } else {
            // Notify room of ready status
            this.io.to(roomId).emit("player-ready-status", {
              playerId: player.id,
              isReady: true,
              room,
            });
          }

          console.log(`User ${socket.userId} ready in room ${roomId}`);
        }
      } catch (error) {
        console.error("Player ready error:", error);
      }
    });

    // Player makes a move (fires at opponent's board)
    socket.on(
      "make-move",
      async (data: { roomId: string; x: number; y: number }) => {
        try {
          if (!socket.userId) return;

          const { roomId, x, y } = data;
          const room = GameRoomModel.getRoom(roomId);

          if (!room || room.gameState !== "playing") {
            socket.emit("move-result", {
              success: false,
              error: "Invalid move",
            });
            return;
          }

          const player = room.players.find((p) => p.userId === socket.userId);
          if (!player || room.currentTurn !== player.id) {
            socket.emit("move-result", {
              success: false,
              error: "Not your turn",
            });
            return;
          }

          // Find opponent
          const opponent = room.players.find((p) => p.id !== player.id);
          if (!opponent) return;

          // Validate target - check if player has already targeted this position
          const alreadyTargeted =
            (player.hits[x] && player.hits[x][y]) ||
            (player.misses[x] && player.misses[x][y]);
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

          // Update the player's tracking of where they've attacked the opponent
          if (moveResult.hit) {
            player.hits[x][y] = true;
          } else {
            player.misses[x][y] = true;
          }

          // Check for game end
          if (moveResult.gameEnded) {
            room.gameState = "finished";
            room.winner = player.id;

            // Update both users' game states to finished
            for (const roomPlayer of room.players) {
              await UserService.updateUserGameState(roomPlayer.userId, {
                roomId,
                playerId: roomPlayer.id,
                ships: roomPlayer.ships,
                isReady: true,
                gamePhase: "finished",
                opponentId: room.players.find((p) => p.id !== roomPlayer.id)
                  ?.userId,
                lastActivity: new Date(),
              });
            }
          } else {
            // Switch turns
            room.currentTurn = opponent.id;
          }

          // Notify all players of move result with updated room state
          this.io.to(roomId).emit("move-result", {
            success: true,
            playerId: player.id,
            x,
            y,
            hit: moveResult.hit,
            shipDestroyed: moveResult.shipDestroyed,
            gameEnded: moveResult.gameEnded,
            winner: moveResult.winner,
            currentTurn: room.currentTurn,
            room: room,
          });

          console.log(
            `Move made by ${socket.userId} in room ${roomId}: (${x}, ${y}) - ${
              moveResult.hit ? "HIT" : "MISS"
            }`
          );
        } catch (error) {
          socket.emit("move-result", { success: false, error: "Server error" });
          console.error("Make move error:", error);
        }
      }
    );

    // Player sends chat message
    socket.on("chat-message", (data: { roomId: string; message: string }) => {
      try {
        if (!socket.userId || !socket.user) return;

        const { roomId, message } = data;
        const room = GameRoomModel.getRoom(roomId);
        if (!room) return;

        const player = room.players.find((p) => p.userId === socket.userId);
        if (player) {
          // Broadcast message to room
          this.io.to(roomId).emit("chat-message", {
            playerId: player.id,
            playerName: player.name,
            message,
            timestamp: new Date(),
          });

          console.log(
            `Chat message from ${socket.user.username} in room ${roomId}: ${message}`
          );
        }
      } catch (error) {
        console.error("Chat message error:", error);
      }
    });

    // Player requests game restart
    socket.on("restart-game", async (data: { roomId: string }) => {
      try {
        if (!socket.userId) return;

        const { roomId } = data;
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

        // Update all users' game states
        for (const player of room.players) {
          await UserService.updateUserGameState(player.userId, {
            roomId,
            playerId: player.id,
            ships: [],
            isReady: false,
            gamePhase: "setup",
            lastActivity: new Date(),
          });
        }

        // Notify all players
        this.io.to(roomId).emit("game-restarted", { room });

        console.log(`Game restarted in room ${roomId}`);
      } catch (error) {
        console.error("Restart game error:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      try {
        const userId = this.socketUsers.get(socket.id);

        if (userId) {
          // Find and leave all rooms this user was in
          const rooms = GameRoomModel.getAllRooms();
          for (const room of rooms) {
            const player = room.players.find((p) => p.userId === userId);
            if (player) {
              GameRoomModel.removePlayerFromRoom(room.id, player.id);
              socket
                .to(room.id)
                .emit("player-disconnected", { playerId: player.id });
            }
          }

          // Clean up mappings
          this.userSockets.delete(userId);
          this.socketUsers.delete(socket.id);

          // Note: We don't clear the user's game state on disconnect
          // This allows for reconnection to the same game

          // Trigger immediate cleanup for empty rooms
          const cleanupTimer = setTimeout(() => {
            try {
              GameRoomModel.cleanupRooms({ emptyRoomTimeout: 0 });
            } catch (error) {
              console.error("Immediate cleanup error:", error);
            }
            this.cleanupTimers.delete(cleanupTimer);
          }, 1000);

          this.cleanupTimers.add(cleanupTimer);

          console.log(`User ${userId} disconnected`);
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

  /**
   * Attempt to reconnect user to their existing game
   */
  private async attemptUserReconnection(
    socket: AuthenticatedSocket,
    user: User
  ): Promise<void> {
    try {
      if (!user.currentGame) {
        return;
      }

      const { roomId, playerId } = user.currentGame;
      const room = GameRoomModel.getRoom(roomId);

      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          // Update player's socket ID
          player.socketId = socket.id;

          // Join the socket room
          socket.join(roomId);

          // Notify user of reconnection
          socket.emit("game-state-restored", {
            room,
            player,
            reconnected: true,
          });

          // Notify other players of reconnection
          socket.to(roomId).emit("user-reconnected", {
            userId: user.id,
            username: user.username,
          });

          console.log(`User ${user.username} reconnected to room ${roomId}`);
        }
      }
    } catch (error) {
      console.error("User reconnection error:", error);
    }
  }
}
