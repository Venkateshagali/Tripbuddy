const db = require("../db");

// Create Trip
exports.createTrip = (req, res) => {
    const { title, description } = req.body;
    const userId = req.user.id;

    if (!title) {
        return res.status(400).json({ message: "Trip title is required" });
    }

    db.query(
        "INSERT INTO trips (title, description, created_by) VALUES (?, ?, ?)",
        [title, description || "", userId],
        (err, result) => {
            if (err) return res.status(500).json(err);

            const tripId = result.insertId;

            // Auto add creator as approved member
            db.query(
                "INSERT INTO trip_members (trip_id, user_id, status) VALUES (?, ?, 'approved')",
                [tripId, userId]
            );

            res.json({
                message: "Trip created successfully",
                tripId
            });
        }
    );
};
// Request to join trip
exports.joinTrip = (req, res) => {
    const { tripId } = req.body;
    const userId = req.user.id;

    db.query(
        "INSERT INTO trip_members (trip_id, user_id, status) VALUES (?, ?, 'pending')",
        [tripId, userId],
        (err) => {
            if (err) {
                return res.status(400).json({ message: "Already requested or error occurred" });
            }
            res.json({ message: "Join request sent" });
        }
    );
};
// Approve member
exports.approveMember = (req, res) => {
    const { tripId, userId } = req.body;
    const requesterId = req.user.id;

    // First check if requester is trip creator
    db.query(
        "SELECT * FROM trips WHERE id = ? AND created_by = ?",
        [tripId, requesterId],
        (err, trips) => {
            if (err || trips.length === 0) {
                return res.status(403).json({ message: "Only trip creator can approve members" });
            }

            db.query(
                "UPDATE trip_members SET status = 'approved' WHERE trip_id = ? AND user_id = ?",
                [tripId, userId],
                (err2) => {
                    if (err2) return res.status(500).json(err2);

                    res.json({ message: "Member approved successfully" });
                }
            );
        }
    );
};
// Get trips where user is approved member
exports.getMyTrips = (req, res) => {
    const userId = req.user.id;

    db.query(
        `
        SELECT t.* 
        FROM trips t
        JOIN trip_members tm ON t.id = tm.trip_id
        WHERE tm.user_id = ? AND tm.status = 'approved'
        `,
        [userId],
        (err, results) => {
            if (err) return res.status(500).json(err);

            res.json(results);
        }
    );
};
// Get single trip details
exports.getTripDetails = (req, res) => {
    const tripId = req.params.id;
    const userId = req.user.id;

    // Check if user is approved member
    db.query(
        "SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ? AND status = 'approved'",
        [tripId, userId],
        (err, memberCheck) => {
            if (err || memberCheck.length === 0) {
                return res.status(403).json({ message: "Access denied to this trip" });
            }

            // Get trip info
            db.query(
                "SELECT * FROM trips WHERE id = ?",
                [tripId],
                (err2, tripResults) => {
                    if (err2) return res.status(500).json(err2);

                    // Get approved members
                    db.query(
                        `
                        SELECT u.id, u.name, u.email
                        FROM users u
                        JOIN trip_members tm ON u.id = tm.user_id
                        WHERE tm.trip_id = ? AND tm.status = 'approved'
                        `,
                        [tripId],
                        (err3, members) => {
                            if (err3) return res.status(500).json(err3);

                            res.json({
                                trip: tripResults[0],
                                members: members
                            });
                        }
                    );
                }
            );
        }
    );
};
