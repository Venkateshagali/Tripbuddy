const express = require("express");
const db = require("../../db");
const { authMiddleware, requireTripMember, requireTripOwner } = require("../middleware/auth");

const router = express.Router();
const pool = db.promise();

router.get("/train/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM train_details WHERE trip_id = ? ORDER BY id ASC", [req.tripId]);
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch train details" });
  }
});

router.get("/vehicle/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vehicle_booking WHERE trip_id = ? ORDER BY id DESC", [req.tripId]);
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch vehicle details" });
  }
});

router.get("/booking/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM booking_details WHERE trip_id = ? ORDER BY id DESC", [req.tripId]);
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch stay details" });
  }
});

router.get("/budget/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM trip_budget WHERE trip_id = ? ORDER BY id ASC", [req.tripId]);
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch budget" });
  }
});

router.get("/itinerary/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM itinerary WHERE trip_id = ? ORDER BY day_number ASC, sort_order ASC, id ASC",
      [req.tripId]
    );
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch itinerary" });
  }
});

router.post("/itinerary/:tripId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const { dayNumber, title, location, description, mapLink, sortOrder = 1 } = req.body;
    if (!dayNumber || !title) return res.status(400).json({ message: "dayNumber and title are required" });

    const [result] = await pool.query(
      `INSERT INTO itinerary (trip_id, day_number, title, location, description, map_link, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.tripId, Number(dayNumber), title, location || null, description || null, mapLink || null, Number(sortOrder)]
    );

    return res.json({ message: "Itinerary added", id: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add itinerary", error: err.message });
  }
});

router.put("/itinerary/:tripId/:itineraryId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const itineraryId = Number(req.params.itineraryId);
    const [rows] = await pool.query("SELECT * FROM itinerary WHERE id = ? AND trip_id = ?", [itineraryId, req.tripId]);
    if (rows.length === 0) return res.status(404).json({ message: "Itinerary item not found" });

    const current = rows[0];
    const next = {
      day_number: req.body.dayNumber ?? current.day_number,
      title: req.body.title ?? current.title,
      location: req.body.location ?? current.location,
      description: req.body.description ?? current.description,
      map_link: req.body.mapLink ?? current.map_link,
      sort_order: req.body.sortOrder ?? current.sort_order
    };

    await pool.query(
      `UPDATE itinerary
       SET day_number = ?, title = ?, location = ?, description = ?, map_link = ?, sort_order = ?
       WHERE id = ?`,
      [Number(next.day_number), next.title, next.location, next.description, next.map_link, Number(next.sort_order), itineraryId]
    );

    return res.json({ message: "Itinerary updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update itinerary", error: err.message });
  }
});

router.delete("/itinerary/:tripId/:itineraryId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const itineraryId = Number(req.params.itineraryId);
    const [result] = await pool.query("DELETE FROM itinerary WHERE id = ? AND trip_id = ?", [itineraryId, req.tripId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Itinerary item not found" });
    return res.json({ message: "Itinerary deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete itinerary", error: err.message });
  }
});

router.put("/train/:tripId/:trainId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const trainId = Number(req.params.trainId);
    const [rows] = await pool.query("SELECT * FROM train_details WHERE id = ? AND trip_id = ?", [trainId, req.tripId]);
    if (rows.length === 0) return res.status(404).json({ message: "Train item not found" });

    const current = rows[0];
    const next = {
      direction: req.body.direction ?? current.direction,
      train_number: req.body.trainNumber ?? current.train_number,
      departure: req.body.departure ?? current.departure,
      arrival: req.body.arrival ?? current.arrival,
      travel_date: req.body.travelDate ?? current.travel_date,
      cost_per_person: req.body.costPerPerson ?? current.cost_per_person
    };

    await pool.query(
      `UPDATE train_details
       SET direction = ?, train_number = ?, departure = ?, arrival = ?, travel_date = ?, cost_per_person = ?
       WHERE id = ?`,
      [next.direction, next.train_number, next.departure, next.arrival, next.travel_date, Number(next.cost_per_person), trainId]
    );
    return res.json({ message: "Train updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update train", error: err.message });
  }
});

router.put("/vehicle/:tripId/:vehicleId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const [rows] = await pool.query("SELECT * FROM vehicle_booking WHERE id = ? AND trip_id = ?", [vehicleId, req.tripId]);
    if (rows.length === 0) return res.status(404).json({ message: "Vehicle item not found" });

    const current = rows[0];
    const next = {
      vehicle_name: req.body.vehicleName ?? current.vehicle_name,
      rent_amount: req.body.rentAmount ?? current.rent_amount,
      pickup_charge: req.body.pickupCharge ?? current.pickup_charge,
      deposit: req.body.deposit ?? current.deposit,
      advance_paid: req.body.advancePaid ?? current.advance_paid,
      remaining_balance: req.body.remainingBalance ?? current.remaining_balance
    };

    await pool.query(
      `UPDATE vehicle_booking
       SET vehicle_name = ?, rent_amount = ?, pickup_charge = ?, deposit = ?, advance_paid = ?, remaining_balance = ?
       WHERE id = ?`,
      [
        next.vehicle_name,
        Number(next.rent_amount),
        Number(next.pickup_charge),
        Number(next.deposit),
        Number(next.advance_paid),
        Number(next.remaining_balance),
        vehicleId
      ]
    );
    return res.json({ message: "Vehicle updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update vehicle", error: err.message });
  }
});

router.put("/booking/:tripId/:bookingId", authMiddleware, requireTripOwner, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const [rows] = await pool.query("SELECT * FROM booking_details WHERE id = ? AND trip_id = ?", [bookingId, req.tripId]);
    if (rows.length === 0) return res.status(404).json({ message: "Booking item not found" });

    const current = rows[0];
    const next = {
      booking_id: req.body.bookingCode ?? current.booking_id,
      property_name: req.body.propertyName ?? current.property_name,
      amount_paid: req.body.amountPaid ?? current.amount_paid,
      checkin_date: req.body.checkinDate ?? current.checkin_date,
      checkout_date: req.body.checkoutDate ?? current.checkout_date,
      guests: req.body.guests ?? current.guests
    };

    await pool.query(
      `UPDATE booking_details
       SET booking_id = ?, property_name = ?, amount_paid = ?, checkin_date = ?, checkout_date = ?, guests = ?
       WHERE id = ?`,
      [next.booking_id, next.property_name, Number(next.amount_paid), next.checkin_date, next.checkout_date, Number(next.guests), bookingId]
    );
    return res.json({ message: "Booking updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update booking", error: err.message });
  }
});

router.get("/payments/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u1.name AS from_name, u2.name AS to_name
       FROM payments p
       JOIN users u1 ON u1.id = p.from_user_id
       JOIN users u2 ON u2.id = p.to_user_id
       WHERE p.trip_id = ?
       ORDER BY p.created_at DESC`,
      [req.tripId]
    );
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

module.exports = router;
