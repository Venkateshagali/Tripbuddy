const db = require("../db");

exports.addItinerary = (req, res) => {
    const { tripId, day, title, description } = req.body;

    db.query(
        "INSERT INTO itinerary (trip_id, day, title, description) VALUES (?, ?, ?, ?)",
        [tripId, day, title, description],
        (err) => {
            if (err) return res.status(500).json(err);

            res.json({ message: "Itinerary added" });
        }
    );
};

exports.getItinerary = (req, res) => {
    const tripId = req.params.tripId;

    db.query(
        "SELECT * FROM itinerary WHERE trip_id = ? ORDER BY day ASC",
        [tripId],
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        }
    );
};
