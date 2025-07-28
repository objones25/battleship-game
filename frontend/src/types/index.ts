// Backend interface definitions - matching exactly with backend/src/types/index.ts

export interface Player {
  id: string;
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

// Frontend-specific interfaces

export interface GameState {
  room: GameRoom | null;
  currentPlayer: Player | null;
  isConnected: boolean;
  error: string | null;
  loading: boolean;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
}

export interface BoardCell {
  x: number;
  y: number;
  state: "empty" | "ship" | "hit" | "miss" | "sunk";
  shipId?: string;
}

export interface ShipPlacement {
  ship: Ship;
  isValid: boolean;
  positions: { x: number; y: number }[];
}

export interface DragState {
  isDragging: boolean;
  draggedShip: Ship | null;
  dragOffset: { x: number; y: number };
  isHorizontal: boolean;
}

// Socket event types - Client to Server
export interface ClientToServerEvents {
  "join-room": (data: { roomId: string; playerName: string }) => void;
  "leave-room": (data: { roomId: string }) => void;
  "place-ships": (data: { roomId: string; ships: Ship[] }) => void;
  "player-ready": (data: { roomId: string }) => void;
  "make-move": (data: { roomId: string; x: number; y: number }) => void;
  "chat-message": (data: { roomId: string; message: string }) => void;
  "restart-game": (data: { roomId: string }) => void;
}

// Socket event types - Server to Client
export interface ServerToClientEvents {
  "joined-room": (data: {
    success: boolean;
    playerId?: string;
    room?: GameRoom;
    error?: string;
  }) => void;
  "player-joined": (data: {
    player: { id: string; name: string };
    room: GameRoom;
  }) => void;
  "player-left": (data: { playerId: string }) => void;
  "ships-placed": (data: { success: boolean; error?: string }) => void;
  "opponent-ships-placed": (data: { playerId: string }) => void;
  "player-ready-status": (data: {
    playerId: string;
    isReady: boolean;
    room: GameRoom;
  }) => void;
  "game-started": (data: { room: GameRoom; currentTurn: string }) => void;
  "move-result": (data: {
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
  }) => void;
  "chat-message": (data: ChatMessage) => void;
  "game-restarted": (data: { room: GameRoom }) => void;
  "player-disconnected": (data: { playerId: string }) => void;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RoomListItem {
  id: string;
  playerCount: number;
  gameState: "waiting" | "setup" | "playing" | "finished";
  createdAt: Date;
}

export interface RoomListResponse {
  rooms: RoomListItem[];
  total: number;
}

export interface CreateRoomRequest {
  playerName: string;
}

export interface JoinRoomRequest {
  playerName: string;
}

// Game configuration
export const GAME_CONFIG = {
  BOARD_SIZE: 10,
  SHIPS: [
    { name: "Carrier", length: 5, count: 1 },
    { name: "Battleship", length: 4, count: 1 },
    { name: "Cruiser", length: 3, count: 1 },
    { name: "Submarine", length: 3, count: 1 },
    { name: "Destroyer", length: 2, count: 1 },
  ],
  CELL_STATES: {
    EMPTY: "empty",
    SHIP: "ship",
    HIT: "hit",
    MISS: "miss",
    SUNK: "sunk",
  } as const,
} as const;

// Utility types
export type CellState =
  (typeof GAME_CONFIG.CELL_STATES)[keyof typeof GAME_CONFIG.CELL_STATES];
export type GamePhase = GameRoom["gameState"];
export type ShipType = (typeof GAME_CONFIG.SHIPS)[number];
