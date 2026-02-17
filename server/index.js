const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./v2/routes/authRoutes");
const tripRoutes = require("./v2/routes/tripRoutes");
const expenseRoutes = require("./v2/routes/expenseRoutes");
const dataRoutes = require("./v2/routes/dataRoutes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
  res.json({ message: "TripBuddy API upgraded and running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api", dataRoutes);

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
