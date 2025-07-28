import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  User,
  AuthToken,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from "../types";
import { UserService } from "./UserService";

export class AuthService {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
  private static readonly SALT_ROUNDS = 12;

  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await UserService.getUserByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: "User with this email already exists",
        };
      }

      // Check if username is taken
      const existingUsername = await UserService.getUserByUsername(
        data.username
      );
      if (existingUsername) {
        return {
          success: false,
          error: "Username is already taken",
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Create user
      const user = await UserService.createUser({
        username: data.username,
        email: data.email,
        passwordHash,
      });

      // Generate token
      const token = this.generateToken(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: "Registration failed",
      };
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await UserService.getUserByEmail(data.email);
      if (!user) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        data.password,
        user.passwordHash
      );
      if (!isValidPassword) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Update last active
      await UserService.updateLastActive(user.id);

      // Generate token
      const token = this.generateToken(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Login failed",
      };
    }
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<User | null> {
    try {
      console.log("=== TOKEN VERIFICATION DEBUG ===");
      console.log("Token to verify:", token.substring(0, 50) + "...");
      console.log("JWT_SECRET:", this.JWT_SECRET);

      const decoded = jwt.verify(token, this.JWT_SECRET) as AuthToken;
      console.log("Token decoded successfully:", decoded);

      const user = await UserService.getUserById(decoded.userId);
      console.log("User lookup result:", user ? "Found" : "Not found");

      if (!user) {
        console.log(
          "User not found in database - likely old token from previous session"
        );
        console.log("This is expected after migrating to persistent storage");
        return null;
      }

      // Update last active
      await UserService.updateLastActive(user.id);
      console.log("Token verification successful");
      console.log("=== END TOKEN DEBUG ===");

      return user;
    } catch (error) {
      console.error("=== TOKEN VERIFICATION ERROR ===");
      console.error("Token verification error:", error);
      console.error("Token:", token.substring(0, 50) + "...");
      console.error("JWT_SECRET:", this.JWT_SECRET);
      console.error("=== END TOKEN ERROR ===");
      return null;
    }
  }

  /**
   * Generate JWT token for user
   */
  static generateToken(user: User): string {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  /**
   * Remove sensitive data from user object
   */
  private static sanitizeUser(user: User): Omit<User, "passwordHash"> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
