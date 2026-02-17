const jwt = require("jsonwebtoken");
const db = require("../../db");

const pool = db.promise();
const JWT_SECRET = process.env.JWT_SECRET || "tripbuddy_secret_key";

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return authHeader;
}

function authMiddleware(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

async function getTripMembership(userId, tripId) {
  const [rows] = await pool.query(
    "SELECT role, status FROM trip_members WHERE trip_id = ? AND user_id = ? AND status = 'approved'",
    [tripId, userId]
  );
  return rows[0] || null;
}

async function requireTripMember(req, res, next) {
  try {
    const tripId = Number(req.params.tripId || req.params.id || req.body.tripId);
    if (!tripId) return res.status(400).json({ message: "tripId required" });

    const membership = await getTripMembership(req.user.id, tripId);
    if (!membership) return res.status(403).json({ message: "You do not have access to this trip" });

    req.tripId = tripId;
    req.membership = membership;
    next();
  } catch (_e) {
    return res.status(500).json({ message: "Authorization check failed" });
  }
}

async function requireTripOwner(req, res, next) {
  try {
    const tripId = Number(req.params.tripId || req.params.id || req.body.tripId);
    if (!tripId) return res.status(400).json({ message: "tripId required" });

    const membership = await getTripMembership(req.user.id, tripId);
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ message: "Only trip owner can do this action" });
    }

    req.tripId = tripId;
    req.membership = membership;
    next();
  } catch (_e) {
    return res.status(500).json({ message: "Authorization check failed" });
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

module.exports = {
  authMiddleware,
  getTripMembership,
  requireTripMember,
  requireTripOwner,
  signToken
};
