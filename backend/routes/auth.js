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
        "INSERT INTO users (name, college_email, password_hash) VALUES (?, ?, ?)"
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

module.exports = router;