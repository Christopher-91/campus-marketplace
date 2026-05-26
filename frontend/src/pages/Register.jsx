import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function Register() {
  const [form, setForm] = useState({ name: "", college_email: "", password: "" });
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
          text: "signup_with",
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
      const res = await api.post("/auth/register", form);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Join CampusStore</h1>
        <p className={styles.subtitle}>Create your account to start buying & selling</p>

        {error && <div className={styles.error}>⚠️ {error}</div>}

        {googleLoading ? (
          <div className={styles.googleBtn} style={{ pointerEvents: "none" }}>
            <span className={styles.spinner}></span>Signing up...
          </div>
        ) : (
          <div ref={googleBtnRef} className={styles.googleBtnContainer}></div>
        )}

        <div className={styles.divider}>or</div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
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
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <><span className={styles.spinner}></span>Creating Account...</> : "Create Account"}
          </button>
        </form>

        <p className={styles.switchLink}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}