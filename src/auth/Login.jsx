import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { adminLogin } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./Login.css";
import illustration from "./assets/login-illustration.png";

const Login = () => {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setLoading(true);

    const toastId = toast.loading("Signing in...");

    try {

      const response = await adminLogin({
        name,
        password
      });

      const token = response.data.data.access_token;

      localStorage.setItem("token", token);

      toast.success("Login successful 🎉", { id: toastId });

      setTimeout(() => {
        navigate("/admin/users");
      }, 500);

    } catch (err) {

      console.error(err);

      toast.error("Invalid username or password", { id: toastId });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* GLOBAL LOADER */}
      {loading && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Authenticating...</p>
          </div>
        </div>
      )}

      {/* LEFT SECTION */}
      <div className="login-left">

        <div className="login-content">

          <p className="logo-text">Your logo</p>

          <h1 className="login-heading">Login</h1>

          <form onSubmit={handleSubmit}>

            {/* Username */}
            <div className="form-group">
              <label>Username</label>

              <input
                type="text"
                placeholder="Enter username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password</label>

              <div className="password-wrapper">

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>

              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="signin-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

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