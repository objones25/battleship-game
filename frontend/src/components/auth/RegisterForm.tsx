import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { register, isLoading, error, clearError } = useAuth();

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push(
        "Password must contain at least one special character (@$!%*?&)"
      );
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors([]);

    if (!username || !email || !password || !confirmPassword) {
      setValidationErrors(["All fields are required"]);
      return;
    }

    if (password !== confirmPassword) {
      setValidationErrors(["Passwords do not match"]);
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }

    await register(username, email, password);
  };

  return (
    <div className="auth-form">
      <h2>Register for Battleship</h2>

      {error && <div className="error-message">{error}</div>}
      {validationErrors.length > 0 && (
        <div className="error-message">
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Choose a username"
            minLength={3}
            maxLength={20}
          />
        </div>

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
            minLength={8}
          />
          <small className="form-hint">
            Password must be at least 8 characters and include: lowercase,
            uppercase, number, and special character (@$!%*?&)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Confirm your password"
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            !username ||
            !email ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword
          }
          className="auth-button"
        >
          {isLoading ? "Creating Account..." : "Register"}
        </button>
      </form>

      <div className="auth-switch">
        <p>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="link-button"
            disabled={isLoading}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}
