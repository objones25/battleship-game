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
