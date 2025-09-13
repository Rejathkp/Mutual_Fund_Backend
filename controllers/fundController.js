import axios from "axios";
import Fund from "../models/Fund.js";
import FundLatestNav from "../models/FundLatestNav.js";
import FundNavHistory from "../models/FundNavHistory.js";

/**
 * Search/list funds using mfapi (with optional pagination).
 * For simplicity we call https://api.mfapi.in/mf which returns an array of funds.
 */
export async function listFunds(req, res) {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;
    // We can fetch the master list (caching would be better) — for the assignment we fetch live
    const resp = await axios.get("https://api.mfapi.in/mf", { timeout: 10000 });
    let funds = resp.data || [];
    if (search) {
      const q = String(search).toLowerCase();
      funds = funds.filter(
        (f) =>
          (f.schemeName || "").toLowerCase().includes(q) ||
          (f.fundHouse || "").toLowerCase().includes(q)
      );
    }
    const totalFunds = funds.length;
    const start = (Number(page) - 1) * Number(limit);
    const paged = funds.slice(start, start + Number(limit)).map((f) => ({
      schemeCode: Number(f.schemeCode),
      schemeName: f.schemeName,
      fundHouse: f.fundHouse,
      schemeType: f.schemeType,
      schemeCategory: f.schemeCategory,
    }));
    return res.json({
      success: true,
      data: {
        funds: paged,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalFunds / Number(limit) || 1),
          totalFunds,
        },
      },
    });
  } catch (err) {
    console.error("listFunds error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch funds" });
  }
}

/**
 * Get NAV history for a schemeCode (returns latest + last 30 days if available in history)
 */
export async function getFundNavHistory(req, res) {
  try {
    const { schemeCode } = req.params;
    if (!schemeCode)
      return res
        .status(400)
        .json({ success: false, message: "schemeCode required" });

    // Try external API for full history
    try {
      const resp = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, {
        timeout: 10000,
      });
      const history =
        resp.data && resp.data.data
          ? resp.data.data
              .slice(0, 30)
              .map((h) => ({ date: h.date, nav: Number(h.nav) }))
          : [];
      const currentNav = history[0] ? history[0].nav : null;
      return res.json({
        success: true,
        data: {
          schemeCode: Number(schemeCode),
          schemeName: resp.data.meta?.scheme_name || null,
          currentNav,
          asOn: history[0] ? history[0].date : null,
          history,
        },
      });
    } catch (err) {
      // fallback to local DB history
      const history = await FundNavHistory.find({
        schemeCode: Number(schemeCode),
      })
        .sort({ createdAt: -1 })
        .limit(30);
      const latest = await FundLatestNav.findOne({
        schemeCode: Number(schemeCode),
      });
      return res.json({
        success: true,
        data: {
          schemeCode: Number(schemeCode),
          schemeName: latest ? latest.schemeName : null,
          currentNav: latest ? latest.nav : null,
          asOn: latest ? latest.date : null,
          history: history.map((h) => ({ date: h.date, nav: h.nav })),
        },
      });
    }
  } catch (err) {
    console.error("getFundNavHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
