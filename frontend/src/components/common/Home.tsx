import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../context/GameContext";
import { ApiService } from "../../services/api";
import type { GameStats } from "../../types";

function Home(): React.ReactElement {
  const { state, connectSocket, clearError } = useGame();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch server stats on component mount
  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        const serverStats = await ApiService.getStatus();
        setStats(serverStats);
      } catch (error) {
        console.error("Failed to fetch server stats:", error);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (): Promise<void> => {
    if (state.isConnected) return;

    setIsConnecting(true);
    try {
      await connectSocket();
    } catch (error) {
      console.error("Connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDismissError = (): void => {
    clearError();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="hero-anchor mb-8">⚓</div>
        <h1 className="hero-title text-6xl font-black mb-6">
          Welcome to Battleship
        </h1>
        <p className="text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed font-light text-glow-white">
          Challenge players from around the world in the classic naval strategy
          game. Place your ships, take aim, and sink your opponent's fleet!
        </p>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-200 font-semibold">Connection Error</h3>
                <p className="text-red-300">{state.error}</p>
              </div>
            </div>
            <button
              onClick={handleDismissError}
              className="text-red-300 hover:text-red-100 text-xl"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`mr-4 ${
                state.isConnected
                  ? "status-online"
                  : isConnecting
                  ? "status-connecting"
                  : "status-offline"
              }`}
            />
            <div>
              <h3 className="text-white font-bold text-lg text-glow">
                {state.isConnected ? "Connected to Server" : "Not Connected"}
              </h3>
              <p className="text-blue-200 text-sm">
                {state.isConnected
                  ? "Ready to play!"
                  : "Connect to start playing with other players"}
              </p>
            </div>
          </div>

          {!state.isConnected && (
            <button
              onClick={handleConnect}
              disabled={isConnecting || state.loading}
              className="btn-primary"
            >
              {isConnecting || state.loading ? (
                <div className="flex items-center">
                  <div className="spinner mr-2" />
                  Connecting...
                </div>
              ) : (
                "Connect"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Server Stats */}
      {stats && (
        <div className="glass-card p-6 mb-8">
          <h3 className="text-white font-bold text-lg mb-6 text-glow">
            Server Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="stats-card">
              <div className="stats-number text-blue-300">
                {stats.activeRooms}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Active Rooms
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-number text-green-300">
                {stats.activePlayers}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Players Online
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-number text-yellow-300">
                {Math.floor(stats.uptime / 3600)}h
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Server Uptime
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Link
          to="/rooms"
          className={`feature-card block no-underline ${
            !state.isConnected ? "disabled" : ""
          }`}
        >
          <div className="text-6xl mb-6">🎯</div>
          <h3 className="text-2xl font-bold text-white mb-4">Join Game</h3>
          <p className="text-blue-200 text-lg">
            Browse available rooms and join an existing game
          </p>
        </Link>

        <div className={`feature-card ${!state.isConnected ? "disabled" : ""}`}>
          <div className="text-6xl mb-6">⚡</div>
          <h3 className="text-2xl font-bold text-white mb-4">Quick Match</h3>
          <p className="text-blue-200 text-lg mb-4">
            Get matched with another player instantly
          </p>
          <div className="mt-6">
            <span className="text-sm text-yellow-300 font-semibold bg-yellow-300/20 px-3 py-1 rounded-full">
              Coming Soon!
            </span>
          </div>
        </div>
      </div>

      {/* Game Rules - Improved Typography */}
      <div className="content-section-wrapper">
        <div className="content-section">
          <h3 className="content-title">How to Play</h3>

          <div className="content-grid">
            <div className="content-section-item">
              <h4 className="content-subtitle">
                <span>🚢</span>
                Setup Phase
              </h4>
              <ul className="content-list">
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Place your{" "}
                    <span className="instruction-highlight">5 ships</span> on
                    the board
                  </span>
                </li>
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Ships:{" "}
                    <span className="instruction-highlight">
                      Carrier (5), Battleship (4), Cruiser (3), Submarine (3),
                      Destroyer (2)
                    </span>
                  </span>
                </li>
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Ships cannot{" "}
                    <span className="instruction-highlight">
                      overlap or touch diagonally
                    </span>
                  </span>
                </li>
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Click <span className="instruction-highlight">"Ready"</span>{" "}
                    when your fleet is positioned
                  </span>
                </li>
              </ul>
            </div>

            <div className="content-section-item">
              <h4 className="content-subtitle">
                <span>⚔️</span>
                Battle Phase
              </h4>
              <ul className="content-list">
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Take turns{" "}
                    <span className="instruction-highlight">
                      firing at your opponent's board
                    </span>
                  </span>
                </li>
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Hit{" "}
                    <span className="instruction-highlight">all positions</span>{" "}
                    of a ship to sink it
                  </span>
                </li>
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    <span className="instruction-highlight">
                      First player to sink all enemy ships wins
                    </span>
                  </span>
                </li>
                <li className="content-list-item">
                  <span className="content-list-bullet">•</span>
                  <span className="instruction-text">
                    Use{" "}
                    <span className="instruction-highlight">
                      chat to communicate
                    </span>{" "}
                    with your opponent
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer-text">
        © 2025 Battleship Game - Built with React & Socket.io
      </div>
    </div>
  );
}

export default Home;
