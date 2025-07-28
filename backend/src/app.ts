import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import routes from "./routes";
import { GameSocketHandler } from "./sockets/GameSocketHandler";
import { GameRoomModel } from "./models/GameRoom";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use(routes);

// Socket.io setup
const gameSocketHandler = new GameSocketHandler(io);
io.on("connection", (socket) => {
  gameSocketHandler.handleConnection(socket);
});

// Setup automatic room cleanup
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
let cleanupTimer: NodeJS.Timeout;

const startCleanupTimer = () => {
  cleanupTimer = setInterval(() => {
    try {
      GameRoomModel.cleanupRooms();
    } catch (error) {
      console.error("Automatic cleanup error:", error);
    }
  }, CLEANUP_INTERVAL);

  console.log(
    `🧹 Automatic room cleanup scheduled every ${
      CLEANUP_INTERVAL / 60000
    } minutes`
  );
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("🛑 Shutting down server gracefully...");

  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    console.log("✅ Cleanup timer stopped");
  }

  // Clear all GameSocketHandler timers
  gameSocketHandler.clearAllTimers();
  console.log("✅ GameSocketHandler timers cleared");

  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚢 Battleship server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);

  // Start automatic cleanup
  startCleanupTimer();
});

export { io, app };
export default server;
