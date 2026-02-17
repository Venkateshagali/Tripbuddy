const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/:tripId", (req, res) => {
  db.query(
    "SELECT * FROM train_details WHERE trip_id = ?",
    [req.params.tripId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

module.exports = router;
