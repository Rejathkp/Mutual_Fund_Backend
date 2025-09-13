import User from "../models/User.js";
import Portfolio from "../models/Portfolio.js";
import Fund from "../models/Fund.js";
import mongoose from "mongoose";

// GET /api/admin/users

export async function listUsers(req, res) {
  try {
    const users = await User.find().select("-passwordHash").lean();
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/portfolios

export async function listAllPortfolios(req, res) {
  try {
    const portfolios = await Portfolio.find()
      .populate("userId", "name email")
      .lean();
    return res.json({ success: true, data: portfolios });
  } catch (err) {
    console.error("listAllPortfolios error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/popular-funds

export async function popularFunds(req, res) {
  try {
    const agg = await Portfolio.aggregate([
      {
        $group: {
          _id: "$schemeCode",
          totalUnits: { $sum: "$units" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalUnits: -1 } },
      { $limit: 10 },
    ]);
    return res.json({ success: true, data: agg });
  } catch (err) {
    console.error("popularFunds error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/stats

export async function systemStats(req, res) {
  try {
    const users = await User.countDocuments();
    const portfolios = await Portfolio.countDocuments();
    const funds = await Fund.countDocuments();
    return res.json({ success: true, data: { users, portfolios, funds } });
  } catch (err) {
    console.error("systemStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
