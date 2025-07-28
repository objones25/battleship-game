import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens from cookies
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from cookie
    const token = req.cookies?.auth_token;

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required",
      });
      return;
    }

    // Verify token
    const user = await AuthService.verifyToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    // Remove password hash from user object
    const { passwordHash, ...sanitizedUser } = user;
    req.user = sanitizedUser;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.auth_token;

    if (token) {
      const user = await AuthService.verifyToken(token);
      if (user) {
        const { passwordHash, ...sanitizedUser } = user;
        req.user = sanitizedUser;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue without user
    console.warn("Optional auth error:", error);
    next();
  }
};
