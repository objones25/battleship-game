import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Auth.css";

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, logout } = useAuth();

  // If user is authenticated, show user info and logout option
  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          <h2>Welcome, {user.username}!</h2>
          <p>Email: {user.email}</p>
          <button onClick={logout} className="auth-button logout-button">
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Show login/register forms
  return (
    <div className="auth-container">
      {isLogin ? (
        <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
}
