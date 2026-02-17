const express = require("express");
const cors = require("cors");

const authRoutes = require("./v2/routes/authRoutes");
const tripRoutes = require("./v2/routes/tripRoutes");
const expenseRoutes = require("./v2/routes/expenseRoutes");
const dataRoutes = require("./v2/routes/dataRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
  res.json({ message: "TripBuddy API upgraded and running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api", dataRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
