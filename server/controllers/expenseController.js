const db = require("../db");

// Add Expense
exports.addExpense = (req, res) => {
    const { tripId, title, amount, splitUsers } = req.body;
    const paidBy = req.user.id;

    if (!tripId || !title || !amount || !splitUsers || splitUsers.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const shareAmount = amount / splitUsers.length;

    db.query(
        "INSERT INTO expenses (trip_id, title, amount, paid_by) VALUES (?, ?, ?, ?)",
        [tripId, title, amount, paidBy],
        (err, result) => {
            if (err) return res.status(500).json(err);

            const expenseId = result.insertId;

            // Insert splits
            const splitValues = splitUsers.map(userId => [
                expenseId,
                userId,
                shareAmount
            ]);

            db.query(
                "INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES ?",
                [splitValues],
                (err2) => {
                    if (err2) return res.status(500).json(err2);

                    res.json({ message: "Expense added successfully" });
                }
            );
        }
    );
};
// Get Trip Balances
exports.getTripBalances = (req, res) => {
    const tripId = req.params.tripId;

    // Total paid by each user
    db.query(
        `
        SELECT u.id, u.name,
        IFNULL(SUM(e.amount),0) AS totalPaid
        FROM users u
        LEFT JOIN expenses e 
        ON u.id = e.paid_by AND e.trip_id = ?
        GROUP BY u.id
        `,
        [tripId],
        (err, paidResults) => {
            if (err) return res.status(500).json(err);

            // Total share of each user
            db.query(
                `
                SELECT u.id,
                IFNULL(SUM(es.share_amount),0) AS totalShare
                FROM users u
                LEFT JOIN expense_splits es 
                ON u.id = es.user_id
                LEFT JOIN expenses e
                ON es.expense_id = e.id
                WHERE e.trip_id = ?
                GROUP BY u.id
                `,
                [tripId],
                (err2, shareResults) => {
                    if (err2) return res.status(500).json(err2);

                    const balances = paidResults.map(user => {
                        const shareData = shareResults.find(s => s.id === user.id);
                        const totalShare = shareData ? shareData.totalShare : 0;

                        return {
                            id: user.id,
                            name: user.name,
                            totalPaid: parseFloat(user.totalPaid),
                            totalShare: parseFloat(totalShare),
                            netBalance: parseFloat(user.totalPaid) - parseFloat(totalShare)
                        };
                    });

                    res.json(balances);
                }
            );
        }
    );
};
exports.getTripExpenses = (req, res) => {
    const tripId = req.params.tripId;

    db.query(
        `
        SELECT e.id, e.title, e.amount, e.created_at,
        u.name AS paidBy
        FROM expenses e
        JOIN users u ON e.paid_by = u.id
        WHERE e.trip_id = ?
        ORDER BY e.created_at DESC
        `,
        [tripId],
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        }
    );
};
exports.getTripSummary = (req, res) => {
    const tripId = req.params.tripId;

    db.query(
        `
        SELECT SUM(amount) AS totalTripSpend
        FROM expenses
        WHERE trip_id = ?
        `,
        [tripId],
        (err, result) => {
            if (err) return res.status(500).json(err);

            res.json({
                totalTripSpend: result[0].totalTripSpend || 0
            });
        }
    );
};
exports.recordPayment = (req, res) => {
    const { tripId, toUserId, amount } = req.body;
    const fromUserId = req.user.id;

    db.query(
        "INSERT INTO payments (trip_id, from_user, to_user, amount, status) VALUES (?, ?, ?, ?, 'pending')",
        [tripId, fromUserId, toUserId, amount],
        (err) => {
            if (err) return res.status(500).json(err);

            res.json({ message: "Payment request recorded" });
        }
    );
};
exports.confirmPayment = (req, res) => {
    const { paymentId } = req.body;

    db.query(
        "UPDATE payments SET status = 'confirmed' WHERE id = ?",
        [paymentId],
        (err) => {
            if (err) return res.status(500).json(err);

            res.json({ message: "Payment confirmed" });
        }
    );
};
// Optimized settlement calculation
exports.getSettlement = (req, res) => {
    const tripId = req.params.tripId;

    db.query(
        `
        SELECT u.id, u.name,
        IFNULL(SUM(CASE WHEN e.paid_by = u.id THEN e.amount ELSE 0 END),0) AS totalPaid,
        IFNULL(SUM(es.share_amount),0) AS totalShare
        FROM users u
        LEFT JOIN trip_members tm ON u.id = tm.user_id
        LEFT JOIN expenses e ON e.trip_id = ? AND e.paid_by = u.id
        LEFT JOIN expense_splits es ON es.user_id = u.id
        LEFT JOIN expenses ex ON es.expense_id = ex.id AND ex.trip_id = ?
        WHERE tm.trip_id = ? AND tm.status = 'approved'
        GROUP BY u.id
        `,
        [tripId, tripId, tripId],
        (err, results) => {
            if (err) return res.status(500).json(err);

            // Calculate net balances
            let balances = results.map(user => ({
                id: user.id,
                name: user.name,
                balance: parseFloat(user.totalPaid) - parseFloat(user.totalShare)
            }));

            let creditors = balances.filter(u => u.balance > 0);
            let debtors = balances.filter(u => u.balance < 0);

            let transactions = [];

            // Greedy settlement
            while (creditors.length > 0 && debtors.length > 0) {
                let creditor = creditors[0];
                let debtor = debtors[0];

                let settleAmount = Math.min(
                    creditor.balance,
                    Math.abs(debtor.balance)
                );

                transactions.push({
                    from: debtor.name,
                    to: creditor.name,
                    amount: parseFloat(settleAmount.toFixed(2))
                });

                creditor.balance -= settleAmount;
                debtor.balance += settleAmount;

                if (creditor.balance === 0) creditors.shift();
                if (debtor.balance === 0) debtors.shift();
            }

            res.json({
                balances,
                transactions
            });
        }
    );
};
