import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { GameSocketHandler } from "./sockets/GameSocketHandler";
import { GameRoomModel } from "./models/GameRoom";
import { Database } from "./config/database";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Security middleware
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  })
);

// CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use(routes);

// Socket.io setup with authentication middleware
io.use(async (_socket, next) => {
  // Allow connection but require authentication via socket events
  // This allows the client to send the auth token after connection
  next();
});

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
const gracefulShutdown = async () => {
  console.log("🛑 Shutting down server gracefully...");

  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    console.log("✅ Cleanup timer stopped");
  }

  // Clear all GameSocketHandler timers
  gameSocketHandler.clearAllTimers();
  console.log("✅ GameSocketHandler timers cleared");

  // Disconnect from database
  try {
    await Database.getInstance().disconnect();
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }

  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await Database.getInstance().connect();

    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚢 Battleship server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready for connections`);

      // Start automatic cleanup
      startCleanupTimer();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export { io, app };
export default server;
