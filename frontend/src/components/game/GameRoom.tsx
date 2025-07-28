import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../../context/GameContext";
import ShipPlacement from "./ShipPlacement";
import GameBoard from "./GameBoard";
import type { Ship } from "../../types";

function GameRoom(): React.ReactElement {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state, leaveRoom, sendChatMessage, placeShips, markReady, makeMove } =
    useGame();
  const [chatInput, setChatInput] = useState("");

  // Redirect if not connected or no room ID
  useEffect(() => {
    if (!state.isConnected) {
      navigate("/");
      return;
    }

    if (!roomId) {
      navigate("/rooms");
      return;
    }
  }, [state.isConnected, roomId, navigate]);

  const handleLeaveRoom = (): void => {
    leaveRoom();
    navigate("/rooms");
  };

  const handleSendMessage = (): void => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Ship placement handlers
  const handleShipsPlaced = (ships: Ship[]): void => {
    placeShips(ships);
  };

  const handleReady = (): void => {
    markReady();
  };

  // Game board handlers
  const handleCellClick = (x: number, y: number): void => {
    makeMove(x, y);
  };

  // Get current player data
  const currentPlayer = state.currentPlayer;
  const opponentPlayer = state.room?.players.find(
    (p) => p.id !== currentPlayer?.id
  );

  // Debug logging
  console.log("GameRoom render - currentPlayer:", currentPlayer);
  console.log("GameRoom render - opponentPlayer:", opponentPlayer);
  console.log("GameRoom render - gameState:", state.room?.gameState);

  // Helper function to combine hits and misses into a single board
  const createCombinedBoard = (
    hits: boolean[][],
    misses: boolean[][]
  ): boolean[][] => {
    const combined = Array(10)
      .fill(null)
      .map(() => Array(10).fill(false));
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        combined[x][y] = (hits[x] && hits[x][y]) || (misses[x] && misses[x][y]);
      }
    }
    return combined;
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

  if (!roomId) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">❓</div>
        <h2 className="text-2xl font-bold text-white mb-4">Invalid Room</h2>
        <p className="text-blue-200 mb-6">No room ID provided.</p>
        <button
          onClick={() => navigate("/rooms")}
          className="btn-primary px-6 py-3 rounded-lg font-semibold"
        >
          Browse Rooms
        </button>
      </div>
    );
  }

  if (!state.room) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-white mb-4">Loading Room...</h2>
        <p className="text-blue-200 mb-6">Connecting to room {roomId}</p>
        <div className="spinner mx-auto mb-6" />
        <button
          onClick={handleLeaveRoom}
          className="btn-secondary px-6 py-3 rounded-lg font-semibold"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Room {state.room.id}
          </h1>
          <p className="text-blue-200">
            Game State: {state.room.gameState} | Players:{" "}
            {state.room.players.length}/2
          </p>
        </div>
        <button
          onClick={handleLeaveRoom}
          className="btn-secondary px-4 py-2 rounded-lg font-semibold"
        >
          Leave Room
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
          </div>
        </div>
      )}

      {/* Game Status */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Game Status</h3>

        {state.room.gameState === "waiting" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Waiting for Players
            </h3>
            <p className="text-blue-200 mb-4">
              {state.room.players.length === 1
                ? "Waiting for another player to join..."
                : "Room is ready! Waiting for players to set up their ships."}
            </p>
            <div className="flex justify-center gap-4">
              {state.room.players.map((player) => (
                <div
                  key={player.id}
                  className="bg-white/10 rounded-lg p-4 text-center"
                >
                  <div className="text-2xl mb-2">👤</div>
                  <div className="text-white font-semibold">{player.name}</div>
                  <div className="text-blue-200 text-sm">
                    {player.isReady ? "Ready" : "Setting up..."}
                  </div>
                </div>
              ))}
              {state.room.players.length === 1 && (
                <div className="bg-white/5 rounded-lg p-4 text-center border-2 border-dashed border-white/20">
                  <div className="text-2xl mb-2">❓</div>
                  <div className="text-white/50 font-semibold">Waiting...</div>
                  <div className="text-blue-200/50 text-sm">For player</div>
                </div>
              )}
            </div>
          </div>
        )}

        {state.room.gameState === "setup" && currentPlayer && (
          <ShipPlacement
            onShipsPlaced={handleShipsPlaced}
            onReady={handleReady}
            className="mb-6"
          />
        )}

        {state.room.gameState === "playing" &&
          currentPlayer &&
          opponentPlayer && (
            <div className="space-y-6">
              {/* Game Status */}
              <div className="text-center py-4">
                <div className="text-4xl mb-2">⚔️</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Battle in Progress!
                </h3>
                <p className="text-blue-200">
                  {state.room.currentTurn === currentPlayer.id
                    ? "Your turn - Click on opponent's board to fire!"
                    : `${opponentPlayer.name}'s turn - Wait for their move...`}
                </p>
              </div>

              {/* Game Boards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Player's Own Board - Show my ships and where opponent has attacked me */}
                <div>
                  <GameBoard
                    board={createCombinedBoard(
                      opponentPlayer.hits || [],
                      opponentPlayer.misses || []
                    )}
                    ships={currentPlayer.ships || []}
                    hits={opponentPlayer.hits}
                    misses={opponentPlayer.misses}
                    isOwnBoard={true}
                    isInteractive={false}
                    currentTurn={false}
                    className="mb-4"
                  />
                </div>

                {/* Opponent's Board - Show where I have attacked opponent */}
                <div>
                  <GameBoard
                    board={createCombinedBoard(
                      currentPlayer.hits || [],
                      currentPlayer.misses || []
                    )}
                    ships={[]} // Don't show opponent's ships
                    hits={currentPlayer.hits}
                    misses={currentPlayer.misses}
                    isOwnBoard={false}
                    isInteractive={true}
                    currentTurn={state.room.currentTurn === currentPlayer.id}
                    onCellClick={handleCellClick}
                    className="mb-4"
                  />
                </div>
              </div>
            </div>
          )}

        {state.room.gameState === "finished" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">
              {state.room.winner === state.currentPlayer?.id ? "🏆" : "💥"}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Game Over!
            </h3>
            <p className="text-blue-200 mb-4">
              {state.room.winner === state.currentPlayer?.id
                ? "Congratulations! You won!"
                : "Better luck next time!"}
            </p>
            <button className="btn-primary px-6 py-3 rounded-lg font-semibold">
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Chat</h3>
        <div className="bg-white/5 rounded-lg p-4 h-40 mb-4 overflow-y-auto">
          {state.chatMessages.length === 0 ? (
            <div className="text-center text-blue-200/50 py-8">
              No messages yet. Say hello to your opponent!
            </div>
          ) : (
            <div className="space-y-2">
              {state.chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    message.playerId === state.currentPlayer?.id
                      ? "bg-blue-500/20 text-blue-100 ml-8"
                      : "bg-white/10 text-white mr-8"
                  }`}
                >
                  <div className="text-xs text-white/70 mb-1">
                    {message.playerName} •{" "}
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  <div>{message.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={handleSendMessage}
            className="btn-primary px-4 py-2 rounded-lg font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameRoom;
