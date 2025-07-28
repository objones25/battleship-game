import { Router } from "express";
import { RoomController } from "../controllers/RoomController";

const router = Router();

// Health check
router.get("/", (_, res) => {
  res.json({ message: "Battleship Game Server", status: "running" });
});

// Room routes
router.get("/api/status", RoomController.getStatus);
router.post("/api/rooms", RoomController.createRoom);
router.get("/api/rooms/:roomId", RoomController.getRoom);
router.post("/api/rooms/:roomId/join", RoomController.joinRoom);
router.get("/api/rooms", RoomController.listRooms);
router.post("/api/cleanup", RoomController.cleanupRooms);

export default router;
