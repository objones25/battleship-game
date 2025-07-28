import React, { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import type { GameState, GameRoom, Player, ChatMessage, Ship } from "../types";
import { socketService } from "../services/socket";

// Game State Actions
type GameAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_ROOM"; payload: GameRoom | null }
  | { type: "SET_CURRENT_PLAYER"; payload: Player | null }
  | { type: "UPDATE_ROOM"; payload: Partial<GameRoom> }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "RESET_STATE" };

// Initial state
const initialState: GameState & { chatMessages: ChatMessage[] } = {
  room: null,
  currentPlayer: null,
  isConnected: false,
  error: null,
  loading: false,
  chatMessages: [],
};

// Game reducer
function gameReducer(
  state: typeof initialState,
  action: GameAction
): typeof initialState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload };

    case "SET_ROOM":
      return { ...state, room: action.payload };

    case "SET_CURRENT_PLAYER":
      return { ...state, currentPlayer: action.payload };

    case "UPDATE_ROOM":
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, ...action.payload },
      };

    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };

    case "RESET_STATE":
      return { ...initialState, isConnected: state.isConnected };

    default:
      return state;
  }
}

// Context type
interface GameContextType {
  state: typeof initialState;
  dispatch: React.Dispatch<GameAction>;

  // Actions
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  placeShips: (ships: Ship[]) => void;
  markReady: () => void;
  makeMove: (x: number, y: number) => void;
  sendChatMessage: (message: string) => void;
  restartGame: () => void;
  clearError: () => void;
}

// Create context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Context provider component
interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({
  children,
}: GameProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Socket connection management
  const connectSocket = async (): Promise<void> => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      await socketService.connect();
      dispatch({ type: "SET_CONNECTED", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      dispatch({ type: "SET_CONNECTED", payload: false });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const disconnectSocket = (): void => {
    socketService.disconnect();
    dispatch({ type: "SET_CONNECTED", payload: false });
    dispatch({ type: "RESET_STATE" });
  };

  // Room management
  const joinRoom = async (roomId: string): Promise<void> => {
    if (!state.isConnected) {
      throw new Error("Socket not connected");
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      // First authenticate the socket connection
      const authResult = await socketService.authenticate();
      if (!authResult.success) {
        throw new Error(authResult.error || "Authentication failed");
      }

      socketService.joinRoom(roomId);

      // Set a timeout to handle cases where joined-room event never arrives
      setTimeout(() => {
        if (state.loading && !state.room) {
          console.error("Room join timeout - joined-room event never received");
          dispatch({
            type: "SET_ERROR",
            payload: "Room join timeout. Please try again.",
          });
          dispatch({ type: "SET_LOADING", payload: false });
        }
      }, 10000); // 10 second timeout

      // The actual room join will be handled by the socket event listener
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join room";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const leaveRoom = (): void => {
    if (state.room) {
      socketService.leaveRoom(state.room.id);
      dispatch({ type: "SET_ROOM", payload: null });
      dispatch({ type: "SET_CURRENT_PLAYER", payload: null });
    }
  };

  // Game actions
  const placeShips = (ships: Ship[]): void => {
    if (!state.room) {
      dispatch({ type: "SET_ERROR", payload: "No room joined" });
      return;
    }

    try {
      socketService.placeShips(state.room.id, ships);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to place ships";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const markReady = (): void => {
    if (!state.room) {
      dispatch({ type: "SET_ERROR", payload: "No room joined" });
      return;
    }

    try {
      socketService.playerReady(state.room.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to mark ready";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const makeMove = (x: number, y: number): void => {
    if (!state.room) {
      dispatch({ type: "SET_ERROR", payload: "No room joined" });
      return;
    }

    try {
      socketService.makeMove(state.room.id, x, y);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to make move";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const sendChatMessage = (message: string): void => {
    if (!state.room) {
      dispatch({ type: "SET_ERROR", payload: "No room joined" });
      return;
    }

    if (!message.trim()) {
      return;
    }

    try {
      socketService.sendChatMessage(state.room.id, message.trim());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const restartGame = (): void => {
    if (!state.room) {
      dispatch({ type: "SET_ERROR", payload: "No room joined" });
      return;
    }

    try {
      socketService.restartGame(state.room.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to restart game";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
    }
  };

  const clearError = (): void => {
    dispatch({ type: "SET_ERROR", payload: null });
  };

  // Socket event listeners
  useEffect(() => {
    if (!state.isConnected) return;

    // Room events
    socketService.onJoinedRoom((data) => {
      if (data.success && data.room && data.playerId) {
        dispatch({ type: "SET_ROOM", payload: data.room });
        const currentPlayer = data.room.players.find(
          (p) => p.id === data.playerId
        );
        if (currentPlayer) {
          dispatch({ type: "SET_CURRENT_PLAYER", payload: currentPlayer });
        }
        dispatch({ type: "SET_ERROR", payload: null });
      } else {
        dispatch({
          type: "SET_ERROR",
          payload: data.error || "Failed to join room",
        });
      }
      dispatch({ type: "SET_LOADING", payload: false });
    });

    socketService.onPlayerJoined((data) => {
      dispatch({ type: "UPDATE_ROOM", payload: data.room });
    });

    socketService.onPlayerLeft((data) => {
      if (state.room) {
        const updatedPlayers = state.room.players.filter(
          (p) => p.id !== data.playerId
        );
        dispatch({ type: "UPDATE_ROOM", payload: { players: updatedPlayers } });
      }
    });

    // Game events
    socketService.onShipsPlaced((data) => {
      if (!data.success && data.error) {
        dispatch({ type: "SET_ERROR", payload: data.error });
      }
    });

    socketService.onPlayerReadyStatus((data) => {
      dispatch({ type: "UPDATE_ROOM", payload: data.room });
    });

    socketService.onGameStarted((data) => {
      console.log("GameContext - onGameStarted:", data);
      dispatch({ type: "SET_ROOM", payload: data.room });

      // Update current player reference
      const currentPlayer = data.room.players.find(
        (p: Player) => p.id === state.currentPlayer?.id
      );
      if (currentPlayer) {
        console.log(
          "GameContext - updating currentPlayer with ships:",
          currentPlayer.ships
        );
        dispatch({ type: "SET_CURRENT_PLAYER", payload: currentPlayer });
      }
    });

    socketService.onMoveResult((data) => {
      if (!data.success && data.error) {
        dispatch({ type: "SET_ERROR", payload: data.error });
      } else if (data.room) {
        // Update the entire room state with the new data from the server
        dispatch({ type: "SET_ROOM", payload: data.room });

        // Update current player reference
        const currentPlayer = data.room.players.find(
          (p: Player) => p.id === state.currentPlayer?.id
        );
        if (currentPlayer) {
          dispatch({ type: "SET_CURRENT_PLAYER", payload: currentPlayer });
        }
      }
    });

    socketService.onChatMessage((data) => {
      dispatch({ type: "ADD_CHAT_MESSAGE", payload: data });
    });

    socketService.onGameRestarted((data) => {
      dispatch({ type: "SET_ROOM", payload: data.room });
      // Clear chat messages on restart
      dispatch({ type: "RESET_STATE" });
      dispatch({ type: "SET_ROOM", payload: data.room });
      dispatch({ type: "SET_CONNECTED", payload: true });
    });

    socketService.onPlayerDisconnected((data) => {
      if (state.room) {
        const updatedPlayers = state.room.players.filter(
          (p) => p.id !== data.playerId
        );
        dispatch({ type: "UPDATE_ROOM", payload: { players: updatedPlayers } });
      }
    });

    // Cleanup function
    return () => {
      socketService.removeAllListeners();
    };
  }, [state.isConnected, state.room]);

  // Context value
  const contextValue: GameContextType = {
    state,
    dispatch,
    connectSocket,
    disconnectSocket,
    joinRoom,
    leaveRoom,
    placeShips,
    markReady,
    makeMove,
    sendChatMessage,
    restartGame,
    clearError,
  };

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
}

// Custom hook to use the game context
export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

export default GameContext;
