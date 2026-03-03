import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Login.css";
import illustration from "./assets/login-illustration.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // TEMPORARY fake validation (for UI demo)
    setError("Invalid email or password. Please try again.");
  };

  return (
    <div className="login-container">
      {/* LEFT SECTION */}
      <div className="login-left">
        <div className="login-content">
          <p className="logo-text">Your logo</p>
          <h1 className="login-heading">Login</h1>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="username@gmail.com"
                className={`input-field ${error ? "input-error" : ""}`}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password</label>

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`input-field ${error ? "input-error" : ""}`}
                />

                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="error-message">
                ● {error}
              </p>
            )}

            <button className="signin-btn">Sign in</button>
          </form>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="login-right">
        <div className="right-panel">
          <img src={illustration} alt="Illustration" />
        </div>
      </div>
    </div>
  );
};

export default Login;