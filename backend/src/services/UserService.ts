import { User, UserGameState } from "../types";
import { Utils } from "../utils";
import { UserModel } from "../models/User";

interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
}

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(data: CreateUserData): Promise<User> {
    const user = new UserModel({
      id: Utils.generatePlayerId(),
      username: data.username,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      createdAt: new Date(),
      lastActive: new Date(),
    });

    await user.save();
    console.log(`User created: ${user.username} (${user.email})`);
    return user.toUserType();
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      const user = await UserModel.findByCustomId(id);
      return user ? user.toUserType() : null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await UserModel.findByEmail(email);
      return user ? user.toUserType() : null;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return null;
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await UserModel.findByUsername(username);
      return user ? user.toUserType() : null;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return null;
    }
  }

  /**
   * Update user's last active timestamp
   */
  static async updateLastActive(userId: string): Promise<void> {
    try {
      const user = await UserModel.findByCustomId(userId);
      if (user) {
        await user.updateLastActive();
      }
    } catch (error) {
      console.error("Error updating last active:", error);
    }
  }

  /**
   * Update user's current game state
   */
  static async updateUserGameState(
    userId: string,
    gameState: UserGameState | undefined
  ): Promise<void> {
    try {
      const user = await UserModel.findByCustomId(userId);
      if (user) {
        await user.setGameState(gameState);
        console.log(`Updated game state for user ${user.username}:`, gameState);
      }
    } catch (error) {
      console.error("Error updating user game state:", error);
    }
  }

  /**
   * Clear user's current game state
   */
  static async clearUserGameState(userId: string): Promise<void> {
    try {
      const user = await UserModel.findByCustomId(userId);
      if (user) {
        await user.clearGameState();
      }
    } catch (error) {
      console.error("Error clearing user game state:", error);
    }
  }

  /**
   * Get all users (for admin/debugging purposes)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const users = await UserModel.find({});
      return users.map((user) => user.toUserType());
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  /**
   * Get users currently in games
   */
  static async getUsersInGames(): Promise<User[]> {
    try {
      const users = await UserModel.find({ currentGame: { $exists: true } });
      return users.map((user) => user.toUserType());
    } catch (error) {
      console.error("Error getting users in games:", error);
      return [];
    }
  }

  /**
   * Delete user (for cleanup/admin purposes)
   */
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const user = await UserModel.findByCustomId(userId);
      if (!user) {
        return false;
      }

      await UserModel.deleteOne({ id: userId });
      console.log(`User deleted: ${user.username} (${user.email})`);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersInGames: number;
  }> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const [totalUsers, activeUsers, usersInGames] = await Promise.all([
        UserModel.countDocuments({}),
        UserModel.countDocuments({ lastActive: { $gt: fiveMinutesAgo } }),
        UserModel.countDocuments({ currentGame: { $exists: true } }),
      ]);

      return {
        totalUsers,
        activeUsers,
        usersInGames,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersInGames: 0,
      };
    }
  }

  /**
   * Cleanup inactive users (for maintenance)
   */
  static async cleanupInactiveUsers(
    inactiveThresholdHours: number = 24
  ): Promise<number> {
    try {
      const now = new Date();
      const threshold = new Date(
        now.getTime() - inactiveThresholdHours * 60 * 60 * 1000
      );

      // Only cleanup users who are not in active games and haven't been active recently
      const result = await UserModel.deleteMany({
        currentGame: { $exists: false },
        lastActive: { $lt: threshold },
      });

      const deletedCount = result.deletedCount || 0;

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} inactive users`);
      }

      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up inactive users:", error);
      return 0;
    }
  }
}
