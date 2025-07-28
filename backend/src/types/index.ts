// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastActive: Date;
  currentGame?: UserGameState;
}

export interface UserGameState {
  roomId: string;
  playerId: string;
  ships: Ship[];
  isReady: boolean;
  gamePhase: "setup" | "playing" | "finished";
  opponentId?: string;
  lastActivity: Date;
}

export interface AuthToken {
  userId: string;
  username: string;
  email: string;
  exp: number;
  iat: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, "passwordHash">;
  token?: string;
  error?: string;
}

// Game Types (Updated for User-based system)
export interface Player {
  id: string;
  userId: string;
  name: string;
  socketId: string;
  isReady: boolean;
  board: (string | null)[][];
  ships: Ship[];
  hits: boolean[][];
  misses: boolean[][];
}

export interface Ship {
  id: string;
  name: string;
  length: number;
  positions: { x: number; y: number }[];
  isDestroyed: boolean;
}

export interface GameRoom {
  id: string;
  players: Player[];
  currentTurn: string | null;
  gameState: "waiting" | "setup" | "playing" | "finished";
  winner: string | null;
  createdAt: Date;
}

export interface MoveResult {
  hit: boolean;
  shipDestroyed?: boolean;
  gameEnded?: boolean;
  winner?: string;
}

export interface GameStats {
  activeRooms: number;
  activePlayers: number;
  uptime: number;
}

// Socket Event Types
export interface SocketAuthData {
  token?: string; // Optional since we extract from cookies
}

export interface SocketAuthResponse {
  success: boolean;
  user?: Omit<User, "passwordHash">;
  error?: string;
}
