import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import Home from "./components/common/Home";
import RoomList from "./components/game/RoomList";
import GameRoom from "./components/game/GameRoom";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./App.css";

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <GameProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
            <header className="bg-blue-900/50 backdrop-blur-sm border-b border-blue-700/50">
              <div className="container mx-auto px-4 py-4">
                <h1 className="text-3xl font-bold text-white text-center">
                  ⚓ Battleship Game
                </h1>
              </div>
            </header>

            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rooms" element={<RoomList />} />
                <Route path="/game/:roomId" element={<GameRoom />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className="mt-auto bg-blue-900/30 backdrop-blur-sm border-t border-blue-700/50">
              <div className="container mx-auto px-4 py-4 text-center text-blue-200">
                <p>
                  &copy; 2025 Battleship Game - Built with React & Socket.io
                </p>
              </div>
            </footer>
          </div>
        </Router>
      </GameProvider>
    </ErrorBoundary>
  );
}

export default App;
