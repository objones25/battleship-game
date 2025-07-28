import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AuthService } from "../services/AuthService";
import { LoginRequest, RegisterRequest } from "../types";

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const registerData: RegisterRequest = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
      };

      const result = await AuthService.register(registerData);

      if (result.success && result.token) {
        // Set HTTP-only cookie for token
        res.cookie("auth_token", result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.status(201).json({
          success: true,
          user: result.user,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Register controller error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const loginData: LoginRequest = {
        email: req.body.email,
        password: req.body.password,
      };

      const result = await AuthService.login(loginData);

      if (result.success && result.token) {
        // Set HTTP-only cookie for token
        res.cookie("auth_token", result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.status(200).json({
          success: true,
          user: result.user,
        });
      } else {
        res.status(401).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Login controller error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    try {
      // Clear the auth cookie
      res.clearCookie("auth_token");

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout controller error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // User is attached to request by auth middleware
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Get current user controller error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  /**
   * Refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      const newToken = AuthService.generateToken(user);

      if (newToken) {
        // Set new HTTP-only cookie
        res.cookie("auth_token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.status(200).json({
          success: true,
          message: "Token refreshed successfully",
        });
      } else {
        res.status(401).json({
          success: false,
          error: "Failed to refresh token",
        });
      }
    } catch (error) {
      console.error("Refresh token controller error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}
