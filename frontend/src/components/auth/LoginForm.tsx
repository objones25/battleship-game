import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      return;
    }

    await login(email, password);
  };

  return (
    <div className="auth-form">
      <h2>Login to Battleship</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="auth-button"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="auth-switch">
        <p>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="link-button"
            disabled={isLoading}
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}
