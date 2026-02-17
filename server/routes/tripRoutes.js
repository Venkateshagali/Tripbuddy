const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");
const authMiddleware = require("../middleware/authMiddleware");

// Protected route
router.post("/create", authMiddleware, tripController.createTrip);
router.post("/join", authMiddleware, tripController.joinTrip);
router.post("/approve", authMiddleware, tripController.approveMember);
router.get("/my", authMiddleware, tripController.getMyTrips);
router.get("/:id", authMiddleware, tripController.getTripDetails);

module.exports = router;
