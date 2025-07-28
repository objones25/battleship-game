import { Router } from "express";
import { body } from "express-validator";
import { RoomController } from "../controllers/RoomController";
import { AuthController } from "../controllers/AuthController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Health check
router.get("/", (_, res) => {
  res.json({ message: "Battleship Game Server", status: "running" });
});

// Authentication routes
router.post(
  "/api/auth/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("username").isLength({ min: 3, max: 20 }).trim(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)"
      ),
  ],
  AuthController.register
);

router.post(
  "/api/auth/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  AuthController.login
);

router.post("/api/auth/logout", AuthController.logout);
router.get("/api/auth/me", authenticateToken, AuthController.getCurrentUser);
router.post(
  "/api/auth/refresh",
  authenticateToken,
  AuthController.refreshToken
);

// Room routes (now require authentication)
router.get("/api/status", RoomController.getStatus);
router.post("/api/rooms", authenticateToken, RoomController.createRoom);
router.get("/api/rooms/:roomId", authenticateToken, RoomController.getRoom);
router.post(
  "/api/rooms/:roomId/join",
  authenticateToken,
  RoomController.joinRoom
);
router.get("/api/rooms", authenticateToken, RoomController.listRooms);
router.post("/api/cleanup", RoomController.cleanupRooms);

export default router;
