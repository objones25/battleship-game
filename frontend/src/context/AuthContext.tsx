import { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import { ApiService } from "../services/api";
import { socketService } from "../services/socket";

// Types
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Actions
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: User }
  | { type: "AUTH_ERROR"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "CLEAR_ERROR" };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_ERROR":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: "AUTH_START" });

      const data = await ApiService.getCurrentUser();

      if (data.success && data.user) {
        dispatch({ type: "AUTH_SUCCESS", payload: data.user });
      } else {
        dispatch({ type: "AUTH_LOGOUT" });
      }
    } catch (error) {
      console.error("Auth check error:", error);
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: "AUTH_START" });

      const data = await ApiService.login(email, password);

      if (data.success && data.user) {
        dispatch({ type: "AUTH_SUCCESS", payload: data.user });

        // Reconnect socket after successful login to include auth cookies
        if (socketService.isConnected()) {
          console.log(
            "Reconnecting socket after login to include auth cookies"
          );
          socketService.disconnect();
          await socketService.connect();
        }
      } else {
        dispatch({ type: "AUTH_ERROR", payload: data.error || "Login failed" });
      }
    } catch (error) {
      dispatch({
        type: "AUTH_ERROR",
        payload:
          error instanceof Error ? error.message : "Network error occurred",
      });
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      dispatch({ type: "AUTH_START" });

      const data = await ApiService.register(email, username, password);

      if (data.success && data.user) {
        dispatch({ type: "AUTH_SUCCESS", payload: data.user });

        // Reconnect socket after successful registration to include auth cookies
        if (socketService.isConnected()) {
          console.log(
            "Reconnecting socket after registration to include auth cookies"
          );
          socketService.disconnect();
          await socketService.connect();
        }
      } else {
        dispatch({
          type: "AUTH_ERROR",
          payload: data.error || "Registration failed",
        });
      }
    } catch (error) {
      dispatch({
        type: "AUTH_ERROR",
        payload:
          error instanceof Error ? error.message : "Network error occurred",
      });
    }
  };

  const logout = async () => {
    try {
      await ApiService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
