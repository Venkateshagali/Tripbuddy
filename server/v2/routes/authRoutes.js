const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../db");
const { authMiddleware, signToken } = require("../middleware/auth");

const router = express.Router();
const pool = db.promise();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password required" });
    }

    const [exists] = await pool.query("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", [email]);
    if (exists.length > 0) return res.status(400).json({ message: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, auth_provider) VALUES (?, ?, ?, 'basic')",
      [name, email, passwordHash]
    );

    const user = { id: result.insertId, name, email };
    return res.json({ message: "User registered successfully", token: signToken(user), user });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? AND deleted_at IS NULL",
      [email]
    );

    if (rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password || "", user.password_hash || "");
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    return res.json({
      message: "Login successful",
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { email, name, googleUid, avatarUrl } = req.body;
    if (!email || !name) return res.status(400).json({ message: "email and name are required" });

    const [existing] = await pool.query("SELECT id, name, email FROM users WHERE email = ? AND deleted_at IS NULL", [email]);

    let user;
    if (existing.length > 0) {
      const existingUser = existing[0];
      await pool.query(
        `UPDATE users
         SET name = ?, google_uid = COALESCE(?, google_uid), avatar_url = COALESCE(?, avatar_url), auth_provider = 'google'
         WHERE id = ?`,
        [name, googleUid || null, avatarUrl || null, existingUser.id]
      );
      user = { id: existingUser.id, name, email };
    } else {
      const [result] = await pool.query(
        "INSERT INTO users (name, email, google_uid, auth_provider, avatar_url) VALUES (?, ?, ?, 'google', ?)",
        [name, email, googleUid || null, avatarUrl || null]
      );
      user = { id: result.insertId, name, email };
    }

    return res.json({ message: "Google login successful", token: signToken(user), user });
  } catch (err) {
    return res.status(500).json({ message: "Google login failed", error: err.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, avatar_url, upi_id FROM users WHERE id = ? AND deleted_at IS NULL",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    return res.json(rows[0]);
  } catch (_e) {
    return res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.put("/me/upi", authMiddleware, async (req, res) => {
  try {
    const { upiId } = req.body;
    await pool.query("UPDATE users SET upi_id = ? WHERE id = ?", [upiId || null, req.user.id]);
    return res.json({ message: "UPI updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update UPI", error: err.message });
  }
});

module.exports = router;
