import axios from "axios";
import type { AxiosResponse } from "axios";
import type {
  GameRoom,
  GameStats,
  RoomListResponse,
  CreateRoomRequest,
  JoinRoomRequest,
} from "../types";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Include cookies for authentication
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API service class
export class ApiService {
  /**
   * Register a new user
   */
  static async register(
    email: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await api.post("/api/auth/register", {
        email,
        username,
        password,
      });
      return response.data;
    } catch (error: any) {
      console.error("Registration failed:", error);
      throw new Error(error.response?.data?.error || "Registration failed");
    }
  }

  /**
   * Login user
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(error.response?.data?.error || "Login failed");
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ success: boolean }> {
    try {
      const response = await api.post("/api/auth/logout");
      return response.data;
    } catch (error: any) {
      console.error("Logout failed:", error);
      throw new Error(error.response?.data?.error || "Logout failed");
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await api.get("/api/auth/me");
      return response.data;
    } catch (error: any) {
      console.error("Get current user failed:", error);
      throw new Error(error.response?.data?.error || "Failed to get user");
    }
  }

  /**
   * Get server status and statistics
   */
  static async getStatus(): Promise<GameStats> {
    try {
      const response: AxiosResponse<GameStats> = await api.get("/api/status");
      return response.data;
    } catch (error) {
      console.error("Failed to get server status:", error);
      throw new Error("Failed to connect to server");
    }
  }

  /**
   * Create a new game room
   */
  static async createRoom(playerName: string): Promise<GameRoom> {
    try {
      const request: CreateRoomRequest = { playerName };
      const response: AxiosResponse<GameRoom> = await api.post(
        "/api/rooms",
        request
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create room:", error);
      throw new Error("Failed to create room");
    }
  }

  /**
   * Get list of available rooms
   */
  static async getRooms(filters?: {
    state?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<RoomListResponse> {
    try {
      const params = new URLSearchParams();

      if (filters?.state) params.append("state", filters.state);
      if (filters?.sortBy) params.append("sortBy", filters.sortBy);
      if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.offset) params.append("offset", filters.offset.toString());

      const response: AxiosResponse<RoomListResponse> = await api.get(
        `/api/rooms${params.toString() ? `?${params.toString()}` : ""}`
      );

      return response.data;
    } catch (error) {
      console.error("Failed to get rooms:", error);
      throw new Error("Failed to load rooms");
    }
  }

  /**
   * Get details of a specific room
   */
  static async getRoom(roomId: string): Promise<GameRoom> {
    try {
      const response: AxiosResponse<GameRoom> = await api.get(
        `/api/rooms/${roomId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to get room ${roomId}:`, error);
      throw new Error("Room not found");
    }
  }

  /**
   * Join a specific room
   */
  static async joinRoom(roomId: string, playerName: string): Promise<GameRoom> {
    try {
      const request: JoinRoomRequest = { playerName };
      const response: AxiosResponse<GameRoom> = await api.post(
        `/api/rooms/${roomId}/join`,
        request
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to join room ${roomId}:`, error);
      throw new Error("Failed to join room");
    }
  }

  /**
   * Trigger manual cleanup (admin function)
   */
  static async cleanupRooms(): Promise<{ message: string; cleaned: number }> {
    try {
      const response: AxiosResponse<{ message: string; cleaned: number }> =
        await api.post("/api/cleanup");
      return response.data;
    } catch (error) {
      console.error("Failed to cleanup rooms:", error);
      throw new Error("Failed to cleanup rooms");
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<{ message: string; status: string }> {
    try {
      const response: AxiosResponse<{ message: string; status: string }> =
        await api.get("/");
      return response.data;
    } catch (error) {
      console.error("Health check failed:", error);
      throw new Error("Server is not responding");
    }
  }
}

// Export default instance for convenience
export default ApiService;
