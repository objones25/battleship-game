import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameRoom,
  Ship,
  ChatMessage,
} from "../types";

// Socket configuration
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export class SocketService {
  private static instance: SocketService;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Connect to the socket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        withCredentials: true, // Include cookies in socket handshake
      });

      this.socket.on("connect", () => {
        console.log("Socket connected:", this.socket?.id);
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(
            new Error("Failed to connect to server after multiple attempts")
          );
        }
      });

      this.socket.on("disconnect", (reason: string) => {
        console.log("Socket disconnected:", reason);
      });

      // Note: reconnect and reconnect_error are internal socket.io events
      // They're not part of our ServerToClientEvents interface
      // We'll handle reconnection through the built-in socket.io mechanisms
    });
  }

  /**
   * Authenticate the socket connection with JWT token
   */
  authenticate(): Promise<{ success: boolean; user?: any; error?: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      // The server will extract the auth token from the HTTP-only cookie
      // No need to send token data - cookies are automatically included in socket handshake
      this.socket.emit("authenticate", {});

      // Listen for authentication response
      this.socket.once("authenticated", (response) => {
        if (response.success) {
          console.log("Socket authenticated successfully");
          resolve(response);
        } else {
          console.error("Socket authentication failed:", response.error);
          resolve(response); // Don't reject, let caller handle the failure
        }
      });

      // Set a timeout for authentication
      setTimeout(() => {
        resolve({ success: false, error: "Authentication timeout" });
      }, 5000);
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Room Management Events

  /**
   * Join a game room
   */
  joinRoom(roomId: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    console.log(`Emitting join-room event for room: ${roomId}`);
    this.socket.emit("join-room", { roomId });
  }

  /**
   * Leave current room
   */
  leaveRoom(roomId: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("leave-room", { roomId });
  }

  // Game Events

  /**
   * Place ships on the board
   */
  placeShips(roomId: string, ships: Ship[]): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("place-ships", { roomId, ships });
  }

  /**
   * Mark player as ready
   */
  playerReady(roomId: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("player-ready", { roomId });
  }

  /**
   * Make a move (fire at opponent's board)
   */
  makeMove(roomId: string, x: number, y: number): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("make-move", { roomId, x, y });
  }

  /**
   * Send chat message
   */
  sendChatMessage(roomId: string, message: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("chat-message", { roomId, message });
  }

  /**
   * Request game restart
   */
  restartGame(roomId: string): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.emit("restart-game", { roomId });
  }

  // Event Listeners

  /**
   * Listen for room join confirmation
   */
  onJoinedRoom(
    callback: (data: {
      success: boolean;
      playerId?: string;
      room?: GameRoom;
      error?: string;
    }) => void
  ): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("joined-room", callback);
  }

  /**
   * Listen for player joined events
   */
  onPlayerJoined(
    callback: (data: {
      player: { id: string; name: string };
      room: GameRoom;
    }) => void
  ): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("player-joined", callback);
  }

  /**
   * Listen for player left events
   */
  onPlayerLeft(callback: (data: { playerId: string }) => void): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("player-left", callback);
  }

  /**
   * Listen for ships placed confirmation
   */
  onShipsPlaced(
    callback: (data: { success: boolean; error?: string }) => void
  ): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("ships-placed", callback);
  }

  /**
   * Listen for opponent ships placed
   */
  onOpponentShipsPlaced(callback: (data: { playerId: string }) => void): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("opponent-ships-placed", callback);
  }

  /**
   * Listen for player ready status updates
   */
  onPlayerReadyStatus(
    callback: (data: {
      playerId: string;
      isReady: boolean;
      room: GameRoom;
    }) => void
  ): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("player-ready-status", callback);
  }

  /**
   * Listen for game started events
   */
  onGameStarted(
    callback: (data: { room: GameRoom; currentTurn: string }) => void
  ): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("game-started", callback);
  }

  /**
   * Listen for move results
   */
  onMoveResult(
    callback: (data: {
      success: boolean;
      playerId?: string;
      x?: number;
      y?: number;
      hit?: boolean;
      shipDestroyed?: boolean;
      gameEnded?: boolean;
      winner?: string;
      currentTurn?: string;
      room?: GameRoom;
      error?: string;
    }) => void
  ): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("move-result", callback);
  }

  /**
   * Listen for chat messages
   */
  onChatMessage(callback: (data: ChatMessage) => void): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("chat-message", callback);
  }

  /**
   * Listen for game restarted events
   */
  onGameRestarted(callback: (data: { room: GameRoom }) => void): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("game-restarted", callback);
  }

  /**
   * Listen for player disconnected events
   */
  onPlayerDisconnected(callback: (data: { playerId: string }) => void): void {
    if (!this.socket) throw new Error("Socket not connected");
    this.socket.on("player-disconnected", callback);
  }

  // Utility Methods

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  /**
   * Remove specific event listener
   */
  removeListener(event: keyof ServerToClientEvents): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    socketId?: string;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected(),
      socketId: this.getSocketId(),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();
export default socketService;
