const express = require("express");
const crypto = require("crypto");
const db = require("../../db");
const { authMiddleware, requireTripMember, requireTripOwner } = require("../middleware/auth");
const { insertActivityLog } = require("../services/activity");

const router = express.Router();
const pool = db.promise();

router.get("/my", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         t.id, t.name, t.destination, t.start_date, t.end_date, t.currency,
         t.cover_image_url, t.name AS title,
         CONCAT(COALESCE(t.destination, ''), ' trip') AS description,
         tm.role,
         (
           SELECT COUNT(*)
           FROM trip_members tm2
           WHERE tm2.trip_id = t.id AND tm2.status = 'approved'
         ) AS member_count,
         (
           SELECT ROUND(COALESCE(SUM(CASE WHEN e.is_deleted = 0 AND e.include_in_settlement = 1 THEN e.amount ELSE 0 END), 0), 2)
           FROM expenses e
           WHERE e.trip_id = t.id
         ) AS total_shared_expense
       FROM trips t
       JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = ? AND tm.status = 'approved'
       WHERE t.deleted_at IS NULL
       ORDER BY t.start_date DESC, t.id DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch trips", error: err.message });
  }
});

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { name, destination, startDate, endDate, currency = "INR", coverImageUrl = null } = req.body;
    if (!name) return res.status(400).json({ message: "Trip name is required" });

    const [result] = await pool.query(
      `INSERT INTO trips
       (name, destination, start_date, end_date, currency, owner_user_id, cover_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, destination || null, startDate || null, endDate || null, currency, req.user.id, coverImageUrl]
    );

    const tripId = result.insertId;
    await pool.query(
      "INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, ?, 'owner', 'approved')",
      [tripId, req.user.id]
    );

    try {
      await insertActivityLog(tripId, req.user.id, "trip", tripId, "created", null, { name, destination, startDate, endDate });
    } catch (_e) {
      // Keep trip creation successful even if activity table is unavailable.
    }

    return res.json({ message: "Trip created successfully", tripId });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create trip", error: err.message });
  }
});

router.post("/:tripId/invite", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const { expiresHours = 72, maxUses = 50 } = req.body;
    const inviteCode = crypto.randomBytes(6).toString("hex");
    const expiresAt = new Date(Date.now() + Number(expiresHours) * 60 * 60 * 1000);

    try {
      await pool.query(
        `INSERT INTO invites
         (trip_id, invite_code, created_by, expires_at, max_uses, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [req.tripId, inviteCode, req.user.id, expiresAt, Number(maxUses)]
      );
    } catch (_e) {
      // Fallback for legacy schema where invites table may not exist.
    }

    await pool.query(
      "UPDATE trips SET invite_code = ?, invite_expires_at = ? WHERE id = ?",
      [inviteCode, expiresAt, req.tripId]
    );

    return res.json({ inviteCode, inviteLink: `${(process.env.FRONTEND_URL || "http://localhost:5173")}/join/${inviteCode}`, expiresAt });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate invite", error: err.message });
  }
});

router.post("/join", authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: "inviteCode is required" });

    let invites = [];
    try {
      [invites] = await pool.query(
        `SELECT * FROM invites
         WHERE invite_code = ?
           AND is_active = 1
           AND expires_at > NOW()
           AND used_count < max_uses
         ORDER BY id DESC LIMIT 1`,
        [inviteCode]
      );
    } catch (_e) {
      // Fallback for legacy schema where invites table may not exist.
      [invites] = await pool.query(
        `SELECT id AS trip_id, invite_code, invite_expires_at AS expires_at
         FROM trips
         WHERE invite_code = ?
           AND (invite_expires_at IS NULL OR invite_expires_at > NOW())
         LIMIT 1`,
        [inviteCode]
      );
      invites = invites.map((x) => ({ ...x, id: null }));
    }

    if (invites.length === 0) return res.status(400).json({ message: "Invalid or expired invite" });

    const invite = invites[0];
    const [existing] = await pool.query(
      "SELECT id, status FROM trip_members WHERE trip_id = ? AND user_id = ?",
      [invite.trip_id, req.user.id]
    );

    if (existing.length > 0) {
      if (existing[0].status !== "approved") {
        await pool.query("UPDATE trip_members SET status = 'approved' WHERE id = ?", [existing[0].id]);
      }
    } else {
      await pool.query(
        "INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, ?, 'member', 'approved')",
        [invite.trip_id, req.user.id]
      );
    }

    if (invite.id) {
      await pool.query("UPDATE invites SET used_count = used_count + 1 WHERE id = ?", [invite.id]);
    }
    try {
      await insertActivityLog(invite.trip_id, req.user.id, "member", req.user.id, "joined_trip", null, { inviteCode });
    } catch (_e) {
      // Keep join-trip flow successful even if activity table is unavailable.
    }

    return res.json({ message: "Joined trip successfully", tripId: invite.trip_id });
  } catch (err) {
    return res.status(500).json({ message: "Failed to join trip", error: err.message });
  }
});

router.get("/:id", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [tripRows] = await pool.query(
      `SELECT t.*, t.name AS title, CONCAT(COALESCE(t.destination, ''), ' trip') AS description
       FROM trips t WHERE t.id = ? AND t.deleted_at IS NULL`,
      [req.tripId]
    );

    if (tripRows.length === 0) return res.status(404).json({ message: "Trip not found" });

    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.upi_id, tm.role
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = ? AND tm.status = 'approved'
       ORDER BY tm.role = 'owner' DESC, u.name ASC`,
      [req.tripId]
    );

    return res.json({ trip: tripRows[0], members, membership: req.membership });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch trip", error: err.message });
  }
});

router.delete("/:tripId/members/:userId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (userId === req.user.id) return res.status(400).json({ message: "Owner cannot remove self" });

    await pool.query("DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?", [req.tripId, userId]);
    try {
      await insertActivityLog(req.tripId, req.user.id, "member", userId, "removed", null, null);
    } catch (_e) {
      // Keep member removal successful even if activity table is unavailable.
    }

    return res.json({ message: "Member removed" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to remove member", error: err.message });
  }
});

router.get("/:tripId/activity", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT al.*, u.name AS actor_name
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.trip_id = ?
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [req.tripId]
    );

    return res.json(rows);
  } catch (_e) {
    return res.status(500).json({ message: "Failed to fetch activity" });
  }
});

module.exports = router;
