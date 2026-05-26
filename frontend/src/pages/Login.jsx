import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function Login() {
  const [form, setForm] = useState({ college_email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  // Render Google's official sign-in button (avoids popup blockers)
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
        callback: async (response) => {
          setGoogleLoading(true);
          setError("");
          try {
            const res = await api.post("/auth/google", {
              credential: response.credential,
            });
            login(res.data.token, res.data.user);
            navigate("/");
          } catch (err) {
            setError(err.response?.data?.error || "Google sign-in failed.");
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: googleBtnRef.current.offsetWidth,
        });
      }
    };

    // Google script may not be loaded yet, retry
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [login, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Welcome Back</h1>
        <p className={styles.subtitle}>Log in to your CampusStore account</p>

        {error && <div className={styles.error}>⚠️ {error}</div>}

        {googleLoading ? (
          <div className={styles.googleBtn} style={{ pointerEvents: "none" }}>
            <span className={styles.spinner}></span>Signing in...
          </div>
        ) : (
          <div ref={googleBtnRef} className={styles.googleBtnContainer}></div>
        )}

        <div className={styles.divider}>or</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>College Email</label>
          <input
            type="email"
            placeholder="you@college.edu"
            value={form.college_email}
            onChange={(e) => setForm({ ...form, college_email: e.target.value })}
            required
          />
          <label>Password</label>
          <input
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <><span className={styles.spinner}></span>Logging in...</> : "Log In"}
          </button>
        </form>

        <p className={styles.switchLink}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}