import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import axios from "axios";

dotenv.config();

import { apiLimiter } from "./middleware/rateLimiters.js";
import { authenticate } from "./middleware/auth.js";

import connectDB from "./lib/db.js";
import authRoutes from "./routers/authRoutes.js";
import portfolioRoutes from "./routers/portfolioRoutes.js";
import fundRoutes from "./routers/fundRoutes.js";
import adminRoutes from "./routers/adminRoutes.js";

import FundLatestNav from "./models/FundLatestNav.js";
import FundNavHistory from "./models/FundNavHistory.js";
import Portfolio from "./models/Portfolio.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Public routes (no auth needed)
app.use("/api/auth", authRoutes);
app.use("/api/funds", fundRoutes);
app.get("/api/health", (req, res) =>
  res.json({
    success: true,
    uptime: process.uptime(),
    now: new Date().toISOString(),
  })
);

// Protected routes (JWT required)
app.use("/api/portfolio", authenticate, apiLimiter, portfolioRoutes);
app.use("/api/admin", authenticate, apiLimiter, adminRoutes);

// Connect DB and start
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      runNavUpdateJob().catch((err) =>
        console.error("Startup NAV update failed:", err)
      );
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

async function fetchLatestNAV(schemeCode) {
  try {
    const url = `https://api.mfapi.in/mf/${schemeCode}`;
    const resp = await axios.get(url, { timeout: 10_000 });
    if (resp.data && resp.data.data && resp.data.data.length) {
      const d = resp.data.data[0];
      return {
        schemeCode: Number(schemeCode),
        nav: Number(d.nav),
        date: d.date, // usually "DD-MM-YYYY"
      };
    }
    throw new Error("No data");
  } catch (err) {
    throw new Error(
      `Failed to fetch latest NAV for ${schemeCode}: ${err.message}`
    );
  }
}

async function updateNavInDb({ schemeCode, nav, date }) {
  await FundLatestNav.findOneAndUpdate(
    { schemeCode },
    { schemeCode, nav, date, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  const exists = await FundNavHistory.findOne({ schemeCode, date });
  if (!exists) {
    await FundNavHistory.create({
      schemeCode,
      nav,
      date,
      createdAt: new Date(),
    });
  }
}

export async function runNavUpdateJob() {
  console.log("Starting NAV update job...");
  try {
    const schemeCodes = await Portfolio.distinct("schemeCode");
    if (!schemeCodes || schemeCodes.length === 0) {
      console.log("No scheme codes found in portfolios. Skipping NAV update.");
      return;
    }

    for (const code of schemeCodes) {
      try {
        const latest = await fetchLatestNAV(code);
        await updateNavInDb(latest);
        console.log(`Updated NAV for ${code}: ${latest.nav} (${latest.date})`);
      } catch (err) {
        console.error(`Error updating NAV for ${code}:`, err.message);
      }
    }

    console.log("NAV update job completed.");
  } catch (err) {
    console.error("NAV update job top-level error:", err);
  }
}

// Schedule job (CRON_EXPRESSION timezone server local)
// default: every day at 00:00 (midnight)
const cronExpr = process.env.CRON_EXPRESSION || "0 0 * * *";
cron.schedule(cronExpr, () => {
  console.log("Cron triggered NAV update at", new Date().toISOString());
  runNavUpdateJob().catch((err) =>
    console.error("Scheduled NAV update failed:", err)
  );
});
