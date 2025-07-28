import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../context/GameContext";
import { ApiService } from "../../services/api";
import type { RoomListItem } from "../../types";

function RoomList(): React.ReactElement {
  const navigate = useNavigate();
  const { state, joinRoom, clearError } = useGame();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  // Redirect if not connected
  useEffect(() => {
    if (!state.isConnected) {
      navigate("/");
      return;
    }
  }, [state.isConnected, navigate]);

  // Fetch rooms on component mount and periodically
  useEffect(() => {
    if (!state.isConnected) return;

    const fetchRooms = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await ApiService.getRooms({
          state: "waiting",
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        setRooms(response.rooms);
      } catch (error) {
        console.error("Failed to fetch rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();

    // Refresh rooms every 10 seconds
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [state.isConnected]);

  const handleCreateRoom = async (): Promise<void> => {
    if (!playerName.trim()) {
      return;
    }

    try {
      setLoading(true);
      const room = await ApiService.createRoom(playerName.trim());

      // Join the created room
      await joinRoom(room.id);
      navigate(`/game/${room.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string): Promise<void> => {
    if (!playerName.trim()) {
      return;
    }

    try {
      setJoiningRoomId(roomId);
      await joinRoom(roomId);
      navigate(`/game/${roomId}`);
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setJoiningRoomId(null);
    }
  };

  const getGameStateDisplay = (gameState: string): string => {
    switch (gameState) {
      case "waiting":
        return "Waiting for players";
      case "setup":
        return "Setting up ships";
      case "playing":
        return "In progress";
      case "finished":
        return "Game finished";
      default:
        return gameState;
    }
  };

  const getGameStateColor = (gameState: string): string => {
    switch (gameState) {
      case "waiting":
        return "text-green-300";
      case "setup":
        return "text-yellow-300";
      case "playing":
        return "text-blue-300";
      case "finished":
        return "text-gray-300";
      default:
        return "text-gray-300";
    }
  };

  if (!state.isConnected) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">🔌</div>
        <h2 className="text-2xl font-bold text-white mb-4">Not Connected</h2>
        <p className="text-blue-200 mb-6">
          You need to connect to the server first.
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn-primary px-6 py-3 rounded-lg font-semibold"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Game Rooms</h1>
          <p className="text-blue-200">
            Join an existing room or create a new one
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="btn-secondary px-4 py-2 rounded-lg font-semibold"
        >
          ← Back to Home
        </button>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-200 font-semibold">Error</h3>
                <p className="text-red-300">{state.error}</p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-red-300 hover:text-red-100 text-xl"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Player Name Input */}
      <div className="glass-card p-6 mb-8">
        <h3 className="text-white font-bold text-lg mb-6 text-glow">
          Enter Your Name
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your player name..."
            className="input-field flex-1"
            maxLength={20}
          />
          <button
            onClick={() => setShowCreateRoom(!showCreateRoom)}
            disabled={!playerName.trim() || loading}
            className="btn-primary"
          >
            {showCreateRoom ? "Cancel" : "Create Room"}
          </button>
        </div>

        {showCreateRoom && (
          <div className="mt-6 p-6 glass-card">
            <p className="text-blue-200 mb-6 text-center text-lg">
              Create a new room and wait for another player to join.
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim() || loading}
              className="btn-success w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2" />
                  Creating...
                </div>
              ) : (
                "🚀 Create & Join Room"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Rooms List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg text-glow">
            Available Rooms
          </h3>
          <div className="text-blue-200 text-sm font-medium">
            {loading ? (
              <div className="flex items-center">
                <div className="spinner mr-2" />
                Refreshing...
              </div>
            ) : (
              `🎮 ${rooms.length} rooms found`
            )}
          </div>
        </div>

        {loading && rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="spinner-large mx-auto mb-6" />
            <p className="text-blue-200 text-lg">Loading rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-8xl mb-6 floating-element">🏠</div>
            <h3 className="text-2xl font-bold text-white mb-4 text-glow">
              No rooms available
            </h3>
            <p className="text-blue-200 text-lg mb-6">
              Be the first to create a room and start playing!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="room-item">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h4 className="text-white font-bold text-lg text-glow">
                        🚢 Room {room.id}
                      </h4>
                      <span
                        className={`text-sm font-semibold px-3 py-1 rounded-full ${getGameStateColor(
                          room.gameState
                        )} bg-white/10`}
                      >
                        {getGameStateDisplay(room.gameState)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-blue-200">
                      <span className="flex items-center">
                        <span className="text-lg mr-1">👥</span>
                        {room.playerCount}/2 players
                      </span>
                      <span className="flex items-center">
                        <span className="text-lg mr-1">🕒</span>
                        Created {new Date(room.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={
                      !playerName.trim() ||
                      room.playerCount >= 2 ||
                      room.gameState !== "waiting" ||
                      joiningRoomId === room.id
                    }
                    className={`${
                      room.playerCount >= 2 || room.gameState !== "waiting"
                        ? "btn-secondary"
                        : "btn-primary"
                    }`}
                  >
                    {joiningRoomId === room.id ? (
                      <div className="flex items-center">
                        <div className="spinner mr-2" />
                        Joining...
                      </div>
                    ) : room.playerCount >= 2 ? (
                      "🚫 Full"
                    ) : room.gameState !== "waiting" ? (
                      "⚔️ In Progress"
                    ) : (
                      "🎯 Join Battle"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomList;
