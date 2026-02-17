const express = require("express");
const router = express.Router();
const db = require("../config/db"); // your db connection

// GET itinerary by trip id
router.get("/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM itinerary WHERE trip_id = ? ORDER BY day_number ASC",
      [tripId]
    );

    res.json(rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
