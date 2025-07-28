import { Request, Response } from "express";
import { AuthController } from "../../src/controllers/AuthController";
import { validationResult } from "express-validator";

// Mock the dependencies
jest.mock("../../src/services/AuthService", () => ({
  AuthService: {
    register: jest.fn(),
    login: jest.fn(),
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
  },
}));

jest.mock("../../src/services/UserService", () => ({
  UserService: {
    createUser: jest.fn(),
    authenticateUser: jest.fn(),
    getUserById: jest.fn(),
    updateUserGameState: jest.fn(),
    clearUserGameState: jest.fn(),
  },
}));

jest.mock("express-validator");

const {
  AuthService: MockedAuthService,
} = require("../../src/services/AuthService");

const mockedValidationResult = validationResult as jest.MockedFunction<
  typeof validationResult
>;

describe("AuthController", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockCookie: jest.Mock;
  let mockClearCookie: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock response object
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockCookie = jest.fn();
    mockClearCookie = jest.fn();

    mockResponse = {
      json: mockJson,
      status: mockStatus,
      cookie: mockCookie,
      clearCookie: mockClearCookie,
    };

    mockRequest = {
      body: {},
      cookies: {},
    };

    // Mock validation result to return no errors by default
    mockedValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    } as any);
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        createdAt: new Date(),
        lastActive: new Date(),
      };

      const mockToken = "jwt-token-123";

      mockRequest.body = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      MockedAuthService.register.mockResolvedValue({
        success: true,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
        },
        token: mockToken,
      });

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedAuthService.register).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });
      expect(mockCookie).toHaveBeenCalledWith("auth_token", mockToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it("should handle validation errors", async () => {
      mockedValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: "Email is required", param: "email" },
          { msg: "Password must be at least 8 characters", param: "password" },
        ],
      } as any);

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Validation failed",
        details: [
          { msg: "Email is required", param: "email" },
          { msg: "Password must be at least 8 characters", param: "password" },
        ],
      });
    });

    it("should handle user creation errors", async () => {
      mockRequest.body = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      MockedAuthService.register.mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      await AuthController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Email already exists",
      });
    });
  });

  describe("login", () => {
    it("should successfully login a user", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date(),
      };

      const mockToken = "jwt-token-123";

      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      MockedAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        token: mockToken,
      });

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedAuthService.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockCookie).toHaveBeenCalledWith("auth_token", mockToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });

    it("should handle invalid credentials", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      MockedAuthService.login.mockResolvedValue({
        success: false,
        error: "Invalid email or password",
      });

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Invalid email or password",
      });
    });

    it("should handle validation errors", async () => {
      mockedValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: "Email is required", param: "email" }],
      } as any);

      await AuthController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Validation failed",
        details: [{ msg: "Email is required", param: "email" }],
      });
    });
  });

  describe("logout", () => {
    it("should successfully logout a user", async () => {
      await AuthController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockClearCookie).toHaveBeenCalledWith("auth_token");
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: "Logged out successfully",
      });
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user info", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date(),
      };

      mockRequest.user = mockUser;

      await AuthController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });

    it("should handle missing user", async () => {
      mockRequest.user = undefined;

      await AuthController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Not authenticated",
      });
    });
  });

  describe("refreshToken", () => {
    it("should successfully refresh token", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date(),
      };

      const mockNewToken = "new-jwt-token-123";

      mockRequest.user = mockUser;

      MockedAuthService.generateToken.mockReturnValue(mockNewToken);

      await AuthController.refreshToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(MockedAuthService.generateToken).toHaveBeenCalledWith(mockUser);
      expect(mockCookie).toHaveBeenCalledWith("auth_token", mockNewToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: "Token refreshed successfully",
      });
    });

    it("should handle missing user in request", async () => {
      mockRequest.user = undefined;

      await AuthController.refreshToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Not authenticated",
      });
    });

    it("should handle failed token generation", async () => {
      const mockUser = {
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date(),
      };

      mockRequest.user = mockUser;

      MockedAuthService.generateToken.mockReturnValue(null);

      await AuthController.refreshToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: "Failed to refresh token",
      });
    });
  });
});
