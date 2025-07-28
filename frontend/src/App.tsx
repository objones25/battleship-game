import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GameProvider } from "./context/GameContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Auth } from "./components/auth/Auth";
import Home from "./components/common/Home";
import RoomList from "./components/game/RoomList";
import GameRoom from "./components/game/GameRoom";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./App.css";

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <AuthProvider>
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
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/rooms"
                    element={
                      <AuthGuard fallback={<Auth />}>
                        <RoomList />
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/game/:roomId"
                    element={
                      <AuthGuard fallback={<Auth />}>
                        <GameRoom />
                      </AuthGuard>
                    }
                  />
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
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
