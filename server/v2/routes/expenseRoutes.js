const express = require("express");
const db = require("../../db");
const { authMiddleware, requireTripMember, getTripMembership } = require("../middleware/auth");
const { round2 } = require("../services/math");
const { insertActivityLog } = require("../services/activity");
const { computeSettlement } = require("../services/settlement");

const router = express.Router();
const pool = db.promise();

async function buildExpenseSplits({ tripId, amount, splitType, payerUserId, excludedUserIds, payerIncluded, customSplits, percentageSplits }) {
  const [members] = await pool.query("SELECT user_id FROM trip_members WHERE trip_id = ? AND status = 'approved'", [tripId]);
  let participantIds = members.map((m) => Number(m.user_id));

  if (Array.isArray(excludedUserIds) && excludedUserIds.length > 0) {
    const excluded = new Set(excludedUserIds.map(Number));
    participantIds = participantIds.filter((id) => !excluded.has(id));
  }

  if (!payerIncluded) participantIds = participantIds.filter((id) => id !== Number(payerUserId));

  if (splitType === "custom") {
    if (!Array.isArray(customSplits) || customSplits.length === 0) throw new Error("customSplits required for custom split");
    const total = round2(customSplits.reduce((sum, item) => sum + Number(item.amount || 0), 0));
    if (Math.abs(total - Number(amount)) > 0.05) throw new Error("Custom split total must match amount");
    return customSplits.map((item) => ({ userId: Number(item.userId), amount: round2(Number(item.amount || 0)), percentage: null }));
  }

  if (splitType === "percentage") {
    if (!Array.isArray(percentageSplits) || percentageSplits.length === 0) throw new Error("percentageSplits required for percentage split");
    const totalPercent = round2(percentageSplits.reduce((sum, item) => sum + Number(item.percentage || 0), 0));
    if (Math.abs(totalPercent - 100) > 0.05) throw new Error("Percentage split must add up to 100");
    return percentageSplits.map((item) => ({
      userId: Number(item.userId),
      amount: round2((Number(amount) * Number(item.percentage || 0)) / 100),
      percentage: round2(Number(item.percentage || 0))
    }));
  }

  if (splitType === "individual") {
    if (!Array.isArray(customSplits) || customSplits.length === 0) throw new Error("customSplits required for individual split");
    return customSplits.map((item) => ({ userId: Number(item.userId), amount: round2(Number(item.amount || 0)), percentage: null }));
  }

  if (participantIds.length === 0) throw new Error("No participants to split");

  const equalShare = round2(Number(amount) / participantIds.length);
  return participantIds.map((userId, index) => {
    if (index === participantIds.length - 1) {
      const running = round2(equalShare * (participantIds.length - 1));
      return { userId, amount: round2(Number(amount) - running), percentage: null };
    }
    return { userId, amount: equalShare, percentage: null };
  });
}

router.post("/add", authMiddleware, async (req, res) => {
  try {
    const {
      tripId,
      title,
      amount,
      category = "Other",
      date,
      notes,
      receiptUrl,
      payerUserId,
      splitType = "equal",
      excludedUserIds = [],
      payerIncluded = true,
      customSplits = [],
      percentageSplits = [],
      includeInSettlement = true,
      isRefundable = false,
      relatedToExpenseId = null,
      splitUsers = []
    } = req.body;

    if (!tripId || !title || !amount) return res.status(400).json({ message: "tripId, title, amount are required" });

    const membership = await getTripMembership(req.user.id, Number(tripId));
    if (!membership) return res.status(403).json({ message: "No access to trip" });

    const finalPayerUserId = Number(payerUserId || req.user.id);
    let finalCustomSplits = customSplits;
    let finalExcluded = excludedUserIds;

    if (Array.isArray(splitUsers) && splitUsers.length > 0 && splitType === "equal") {
      const [tripMembers] = await pool.query("SELECT user_id FROM trip_members WHERE trip_id = ? AND status = 'approved'", [tripId]);
      const ids = new Set(tripMembers.map((m) => Number(m.user_id)));
      finalExcluded = [...ids].filter((id) => !splitUsers.map(Number).includes(id));
    }

    if (splitType === "individual" && (!Array.isArray(finalCustomSplits) || finalCustomSplits.length === 0)) {
      finalCustomSplits = [{ userId: finalPayerUserId, amount: Number(amount) }];
    }

    const splits = await buildExpenseSplits({
      tripId: Number(tripId),
      amount: Number(amount),
      splitType,
      payerUserId: finalPayerUserId,
      excludedUserIds: finalExcluded,
      payerIncluded,
      customSplits: finalCustomSplits,
      percentageSplits
    });

    const [expenseResult] = await pool.query(
      `INSERT INTO expenses
       (trip_id, title, amount, category, expense_date, notes, receipt_url,
        payer_user_id, split_type, payer_included, include_in_settlement,
        is_refundable, related_to_expense_id, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(tripId),
        title,
        Number(amount),
        category,
        date || new Date(),
        notes || null,
        receiptUrl || null,
        finalPayerUserId,
        splitType,
        payerIncluded ? 1 : 0,
        includeInSettlement ? 1 : 0,
        isRefundable ? 1 : 0,
        relatedToExpenseId,
        req.user.id,
        req.user.id
      ]
    );

    const expenseId = expenseResult.insertId;
    for (const split of splits) {
      await pool.query(
        "INSERT INTO expense_splits (expense_id, user_id, split_mode, amount, percentage, is_excluded) VALUES (?, ?, ?, ?, ?, 0)",
        [expenseId, split.userId, splitType, split.amount, split.percentage]
      );
    }

    await insertActivityLog(Number(tripId), req.user.id, "expense", expenseId, "created", null, { title, amount, splitType });

    res.json({ message: "Expense added successfully", expenseId });
  } catch (err) {
    res.status(500).json({ message: "Failed to add expense", error: err.message });
  }
});

router.get("/trip/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         e.id, e.title, e.amount, e.category, e.expense_date, e.notes,
         e.split_type, e.include_in_settlement, e.created_by,
         u.name AS paidBy, e.payer_user_id
       FROM expenses e
       JOIN users u ON u.id = e.payer_user_id
       WHERE e.trip_id = ? AND e.is_deleted = 0
       ORDER BY e.expense_date DESC, e.id DESC`,
      [req.tripId]
    );
    res.json(rows);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

router.get("/member/:tripId/:userId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const [paidExpenses] = await pool.query(
      `SELECT
         e.id, e.title, e.amount, e.category, e.expense_date, e.notes,
         e.split_type, e.include_in_settlement
       FROM expenses e
       WHERE e.trip_id = ?
         AND e.is_deleted = 0
         AND e.payer_user_id = ?
       ORDER BY e.expense_date DESC, e.id DESC`,
      [req.tripId, userId]
    );

    const [splits] = await pool.query(
      `SELECT
         es.id, es.amount AS share_amount, es.percentage, es.split_mode,
         e.id AS expense_id, e.title, e.category, e.expense_date,
         e.include_in_settlement, u.name AS paid_by_name
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       JOIN users u ON u.id = e.payer_user_id
       WHERE e.trip_id = ?
         AND e.is_deleted = 0
         AND es.user_id = ?
       ORDER BY e.expense_date DESC, e.id DESC`,
      [req.tripId, userId]
    );

    const totals = {
      paid: round2(paidExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)),
      shared: round2(
        splits
          .filter((s) => Number(s.include_in_settlement) === 1)
          .reduce((sum, s) => sum + Number(s.share_amount || 0), 0)
      ),
      personal: round2(
        splits
          .filter((s) => Number(s.include_in_settlement) === 0)
          .reduce((sum, s) => sum + Number(s.share_amount || 0), 0)
      )
    };

    return res.json({ paidExpenses, splits, totals });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch member expense details", error: err.message });
  }
});

router.get("/summary/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         ROUND(COALESCE(SUM(CASE WHEN include_in_settlement = 1 AND is_deleted = 0 THEN amount ELSE 0 END), 0), 2) AS total_shared,
         ROUND(COALESCE(SUM(CASE WHEN include_in_settlement = 0 AND is_deleted = 0 THEN amount ELSE 0 END), 0), 2) AS total_personal
       FROM expenses
       WHERE trip_id = ?`,
      [req.tripId]
    );
    res.json(rows[0]);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

router.get("/settlement/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const settlement = await computeSettlement(req.tripId);
    res.json(settlement);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settlement", error: err.message });
  }
});

router.get("/balances/:tripId", authMiddleware, requireTripMember, async (req, res) => {
  try {
    const settlement = await computeSettlement(req.tripId);
    res.json(settlement.balances);
  } catch (_e) {
    res.status(500).json({ message: "Failed to fetch balances" });
  }
});

router.put("/:expenseId", authMiddleware, async (req, res) => {
  try {
    const expenseId = Number(req.params.expenseId);
    const [rows] = await pool.query("SELECT * FROM expenses WHERE id = ? AND is_deleted = 0", [expenseId]);
    if (rows.length === 0) return res.status(404).json({ message: "Expense not found" });

    const expense = rows[0];
    const membership = await getTripMembership(req.user.id, expense.trip_id);
    if (!membership) return res.status(403).json({ message: "No access" });
    if (membership.role !== "owner" && expense.created_by !== req.user.id) {
      return res.status(403).json({ message: "Members can edit only their own expenses" });
    }

    const updated = {
      title: req.body.title || expense.title,
      amount: req.body.amount || expense.amount,
      category: req.body.category || expense.category,
      expense_date: req.body.date || expense.expense_date,
      notes: req.body.notes !== undefined ? req.body.notes : expense.notes
    };

    await pool.query(
      "UPDATE expenses SET title = ?, amount = ?, category = ?, expense_date = ?, notes = ?, updated_by = ? WHERE id = ?",
      [updated.title, updated.amount, updated.category, updated.expense_date, updated.notes, req.user.id, expenseId]
    );

    await insertActivityLog(expense.trip_id, req.user.id, "expense", expenseId, "updated", expense, updated);
    return res.json({ message: "Expense updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update expense", error: err.message });
  }
});

router.delete("/:expenseId", authMiddleware, async (req, res) => {
  try {
    const expenseId = Number(req.params.expenseId);
    const [rows] = await pool.query("SELECT * FROM expenses WHERE id = ? AND is_deleted = 0", [expenseId]);
    if (rows.length === 0) return res.status(404).json({ message: "Expense not found" });

    const expense = rows[0];
    const membership = await getTripMembership(req.user.id, expense.trip_id);
    if (!membership) return res.status(403).json({ message: "No access" });
    if (membership.role !== "owner" && expense.created_by !== req.user.id) {
      return res.status(403).json({ message: "Members can delete only their own expenses" });
    }

    await pool.query("UPDATE expenses SET is_deleted = 1, deleted_at = NOW(), updated_by = ? WHERE id = ?", [req.user.id, expenseId]);
    await insertActivityLog(expense.trip_id, req.user.id, "expense", expenseId, "deleted", expense, null);

    return res.json({ message: "Expense deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete expense", error: err.message });
  }
});

router.post("/payment", authMiddleware, async (req, res) => {
  try {
    const { tripId, toUserId, amount, notes } = req.body;
    const membership = await getTripMembership(req.user.id, Number(tripId));
    if (!membership) return res.status(403).json({ message: "No access" });

    const [result] = await pool.query(
      `INSERT INTO payments
       (trip_id, from_user_id, to_user_id, amount, status, marked_paid_at, marked_by, notes)
       VALUES (?, ?, ?, ?, 'marked_paid', NOW(), ?, ?)`,
      [Number(tripId), req.user.id, Number(toUserId), Number(amount), req.user.id, notes || null]
    );

    await insertActivityLog(Number(tripId), req.user.id, "payment", result.insertId, "marked_paid", null, { toUserId, amount });
    return res.json({ message: "Payment marked as paid", paymentId: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark payment", error: err.message });
  }
});

router.post("/payment/confirm", authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const [rows] = await pool.query("SELECT * FROM payments WHERE id = ?", [Number(paymentId)]);
    if (rows.length === 0) return res.status(404).json({ message: "Payment not found" });

    const payment = rows[0];
    const membership = await getTripMembership(req.user.id, payment.trip_id);
    if (!membership || membership.role !== "owner") {
      return res.status(403).json({ message: "Only owner can confirm settlements" });
    }

    await pool.query("UPDATE payments SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = ? WHERE id = ?", [req.user.id, payment.id]);
    await insertActivityLog(payment.trip_id, req.user.id, "payment", payment.id, "confirmed", payment, null);

    return res.json({ message: "Payment confirmed" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to confirm payment", error: err.message });
  }
});

module.exports = router;
