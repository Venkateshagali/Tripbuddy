const db = require("../../db");
const { round2 } = require("./math");

const pool = db.promise();

async function computeSettlement(tripId) {
  const [members] = await pool.query(
    `SELECT u.id, u.name
     FROM users u
     JOIN trip_members tm ON tm.user_id = u.id
     WHERE tm.trip_id = ? AND tm.status = 'approved'
     ORDER BY u.name`,
    [tripId]
  );

  const [owedRows] = await pool.query(
    `SELECT es.user_id, SUM(es.amount) AS owed
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.trip_id = ? AND e.is_deleted = 0 AND e.include_in_settlement = 1
     GROUP BY es.user_id`,
    [tripId]
  );

  const [paidRows] = await pool.query(
    `SELECT payer_user_id AS user_id, SUM(amount) AS paid
     FROM expenses
     WHERE trip_id = ? AND is_deleted = 0 AND include_in_settlement = 1
     GROUP BY payer_user_id`,
    [tripId]
  );

  const [individualRows] = await pool.query(
    `SELECT es.user_id, SUM(es.amount) AS personal_total
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.trip_id = ? AND e.is_deleted = 0 AND e.include_in_settlement = 0
     GROUP BY es.user_id`,
    [tripId]
  );

  const [confirmedPayments] = await pool.query(
    `SELECT from_user_id, to_user_id, amount
     FROM payments
     WHERE trip_id = ? AND status = 'confirmed' AND COALESCE(apply_to_settlement, 1) = 1`,
    [tripId]
  );

  const owedMap = new Map(owedRows.map((r) => [r.user_id, Number(r.owed || 0)]));
  const paidMap = new Map(paidRows.map((r) => [r.user_id, Number(r.paid || 0)]));
  const personalMap = new Map(individualRows.map((r) => [r.user_id, Number(r.personal_total || 0)]));
  const paymentAdjustmentMap = new Map();
  const paymentOutMap = new Map();

  for (const payment of confirmedPayments) {
    const fromId = Number(payment.from_user_id);
    const toId = Number(payment.to_user_id);
    const amt = Number(payment.amount || 0);

    paymentAdjustmentMap.set(fromId, Number(paymentAdjustmentMap.get(fromId) || 0) + amt);
    paymentAdjustmentMap.set(toId, Number(paymentAdjustmentMap.get(toId) || 0) - amt);
    paymentOutMap.set(fromId, Number(paymentOutMap.get(fromId) || 0) + amt);
  }

  const balances = members.map((m) => {
    const expensePaid = round2(paidMap.get(m.id) || 0);
    const directPaid = round2(paymentOutMap.get(m.id) || 0);
    const totalPaid = round2(expensePaid + directPaid);
    const totalShare = round2(owedMap.get(m.id) || 0);
    const personalTotal = round2(personalMap.get(m.id) || 0);
    const paymentAdjustment = round2(paymentAdjustmentMap.get(m.id) || 0);
    return {
      id: m.id,
      name: m.name,
      expensePaid,
      directPaid,
      totalPaid,
      totalShare,
      personalTotal,
      paymentAdjustment,
      netBalance: round2(expensePaid - totalShare + paymentAdjustment)
    };
  });

  const creditors = balances.filter((x) => x.netBalance > 0).map((x) => ({ ...x, remaining: x.netBalance }));
  const debtors = balances.filter((x) => x.netBalance < 0).map((x) => ({ ...x, remaining: Math.abs(x.netBalance) }));

  creditors.sort((a, b) => b.remaining - a.remaining);
  debtors.sort((a, b) => b.remaining - a.remaining);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.remaining, creditor.remaining));

    if (amount > 0) {
      transactions.push({
        fromUserId: debtor.id,
        from: debtor.name,
        toUserId: creditor.id,
        to: creditor.name,
        amount
      });
    }

    debtor.remaining = round2(debtor.remaining - amount);
    creditor.remaining = round2(creditor.remaining - amount);

    if (debtor.remaining <= 0.009) i += 1;
    if (creditor.remaining <= 0.009) j += 1;
  }

  return {
    balances,
    transactions,
    totals: {
      sharedTotal: round2(balances.reduce((sum, x) => sum + x.totalShare, 0)),
      personalTotal: round2(balances.reduce((sum, x) => sum + x.personalTotal, 0))
    }
  };
}

module.exports = { computeSettlement };
