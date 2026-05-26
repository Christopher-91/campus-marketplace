const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

// POST /api/auth/register
router.post("/register", (req, res) => {
  try {
    const { name, college_email, password } = req.body;

    if (!name || !college_email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const existing = db
      .prepare("SELECT * FROM users WHERE college_email = ?")
      .get(college_email);
    if (existing)
      return res.status(409).json({ error: "Email already registered" });

    const password_hash = bcrypt.hashSync(password, 10);

    const result = db
      .prepare(
        "INSERT INTO users (name, college_email, password_hash, auth_provider) VALUES (?, ?, ?, 'local')"
      )
      .run(name, college_email, password_hash);

    const token = jwt.sign(
      { user_id: Number(result.lastInsertRowid), name, email: college_email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user: { name, email: college_email } });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  try {
    const { college_email, password } = req.body;

    const user = db
      .prepare("SELECT * FROM users WHERE college_email = ?")
      .get(college_email);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If user signed up via Google, they don't have a password
    if (user.auth_provider === "google" && !user.password_hash) {
      return res.status(400).json({ error: "This account uses Google Sign-In. Please sign in with Google." });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      { user_id: Number(user.user_id), name: user.name, email: user.college_email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { name: user.name, email: user.college_email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/google — Google Sign-In
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    // Verify the Google JWT token via Google's tokeninfo endpoint
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!response.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const payload = await response.json();

    // Verify audience matches our client ID (if configured)
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (
      googleClientId &&
      !googleClientId.startsWith("your_") &&
      payload.aud !== googleClientId
    ) {
      return res.status(401).json({ error: "Token was not issued for this app" });
    }

    const { email, name, email_verified } = payload;

    if (!email_verified || email_verified === "false") {
      return res.status(401).json({ error: "Google email is not verified" });
    }

    // Check if user already exists
    let user = db
      .prepare("SELECT * FROM users WHERE college_email = ?")
      .get(email);

    if (user) {
      // Existing user — update auth_provider if they previously used local
      if (user.auth_provider === "local") {
        db.prepare("UPDATE users SET auth_provider = 'google' WHERE user_id = ?").run(user.user_id);
      }
    } else {
      // New user — create account (no password needed)
      const result = db
        .prepare(
          "INSERT INTO users (name, college_email, password_hash, auth_provider) VALUES (?, ?, NULL, 'google')"
        )
        .run(name || email.split("@")[0], email);

      user = {
        user_id: Number(result.lastInsertRowid),
        name: name || email.split("@")[0],
        college_email: email,
      };
    }

    const token = jwt.sign(
      { user_id: Number(user.user_id), name: user.name, email: user.college_email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { name: user.name, email: user.college_email } });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Google sign-in failed. Please try again." });
  }
});

module.exports = router;