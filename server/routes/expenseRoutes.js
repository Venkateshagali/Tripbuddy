const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/add", authMiddleware, expenseController.addExpense);
router.get("/balances/:tripId", authMiddleware, expenseController.getTripBalances);
router.get("/trip/:tripId", authMiddleware, expenseController.getTripExpenses);
router.get("/summary/:tripId", authMiddleware, expenseController.getTripSummary);
router.post("/payment", authMiddleware, expenseController.recordPayment);
router.post("/payment/confirm", authMiddleware, expenseController.confirmPayment);
router.get("/settlement/:tripId", authMiddleware, expenseController.getSettlement);

module.exports = router;
