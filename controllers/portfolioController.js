import Portfolio from "../models/Portfolio.js";
import FundLatestNav from "../models/FundLatestNav.js";
import FundNavHistory from "../models/FundNavHistory.js";
import Fund from "../models/Fund.js";
import axios from "axios";

/**
 * Add a fund to user's portfolio
 */
export async function addToPortfolio(req, res) {
  try {
    const userId = req.user.id;
    const { schemeCode, units, purchaseDate } = req.body;

    if (!schemeCode || !units || Number(units) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    // Fetch latest NAV at the time of purchase
    const navResp = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`, {
      timeout: 10000,
    });
    if (!navResp.data || !navResp.data.data || !navResp.data.data[0]) {
      return res
        .status(400)
        .json({ success: false, message: "Unable to fetch NAV for scheme" });
    }

    const latest = navResp.data.data[0];
    const purchaseNav = Number(latest.nav);
    const investedAmount = purchaseNav * Number(units);

    // Save NAV snapshot to FundLatestNav
    await FundLatestNav.findOneAndUpdate(
      { schemeCode: Number(schemeCode) },
      {
        schemeCode: Number(schemeCode),
        nav: purchaseNav,
        date: latest.date,
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    // Save portfolio entry
    const p = await Portfolio.create({
      userId,
      schemeCode: Number(schemeCode),
      units: Number(units),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchaseNav,
      investedAmount,
    });

    // Save/update fund metadata
    try {
      const fundMeta = {
        schemeCode: Number(schemeCode),
        schemeName: navResp.data.meta?.scheme_name || navResp.data.schemeName,
        fundHouse: navResp.data.meta?.fund_house,
        schemeType: navResp.data.meta?.scheme_type,
        schemeCategory: navResp.data.meta?.scheme_category,
      };
      await Fund.findOneAndUpdate(
        { schemeCode: fundMeta.schemeCode },
        fundMeta,
        { upsert: true }
      );
    } catch (err) {
      console.warn("Fund metadata update failed:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Fund added to portfolio successfully",
      portfolio: p,
    });
  } catch (err) {
    console.error("addToPortfolio error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * List user's portfolio with current NAV values
 */
export async function listPortfolio(req, res) {
  try {
    const userId = req.user.id;
    const holdings = await Portfolio.find({ userId }).lean();

    const schemeCodes = [...new Set(holdings.map((h) => h.schemeCode))];
    const navs = await FundLatestNav.find({ schemeCode: { $in: schemeCodes } });
    const navMap = {};
    navs.forEach((n) => (navMap[n.schemeCode] = n));

    const holdingsWithNav = holdings.map((h) => {
      const latest = navMap[h.schemeCode];
      const currentNav = latest ? latest.nav : null;
      const currentValue = currentNav
        ? Number((h.units * currentNav).toFixed(2))
        : null;
      return {
        id: h._id,
        schemeCode: h.schemeCode,
        units: h.units,
        purchaseDate: h.purchaseDate,
        currentNav,
        currentValue,
      };
    });

    return res.json({
      success: true,
      data: {
        totalHoldings: holdingsWithNav.length,
        holdings: holdingsWithNav,
      },
    });
  } catch (err) {
    console.error("listPortfolio error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Remove fund from portfolio by schemeCode
 */
export async function removeFromPortfolio(req, res) {
  try {
    const userId = req.user.id;
    const { schemeCode } = req.params;
    if (!schemeCode)
      return res
        .status(400)
        .json({ success: false, message: "schemeCode required" });

    await Portfolio.deleteMany({ userId, schemeCode: Number(schemeCode) });
    return res.json({
      success: true,
      message: "Fund removed from portfolio successfully",
    });
  } catch (err) {
    console.error("removeFromPortfolio error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Calculate portfolio value and P/L
 */
export async function portfolioValue(req, res) {
  try {
    const userId = req.user.id;
    const portfolios = await Portfolio.find({ userId }).lean();
    if (!portfolios.length) {
      return res.json({
        success: true,
        data: {
          totalInvestment: 0,
          currentValue: 0,
          profitLoss: 0,
          profitLossPercent: 0,
          asOn: null,
          holdings: [],
        },
      });
    }

    const schemeCodes = [...new Set(portfolios.map((p) => p.schemeCode))];
    const navs = await FundLatestNav.find({ schemeCode: { $in: schemeCodes } });
    const navMap = {};
    navs.forEach((n) => (navMap[n.schemeCode] = n));

    let totalInvestment = 0;
    let currentValue = 0;
    const holdings = [];

    for (const p of portfolios) {
      const latest = navMap[p.schemeCode];
      const currentNav = latest ? latest.nav : null;
      const currentVal = currentNav ? p.units * currentNav : 0;

      totalInvestment += p.investedAmount;
      currentValue += currentVal;

      holdings.push({
        schemeCode: p.schemeCode,
        units: p.units,
        purchaseNav: p.purchaseNav,
        investedAmount: p.investedAmount,
        currentNav,
        currentValue: Number(currentVal.toFixed(2)),
        profitLoss: Number((currentVal - p.investedAmount).toFixed(2)),
      });
    }

    const profitLoss = Number((currentValue - totalInvestment).toFixed(2));
    const profitLossPercent = totalInvestment
      ? Number(((profitLoss / totalInvestment) * 100).toFixed(2))
      : 0;
    const asOn = navs[0] ? navs[0].date : null;

    return res.json({
      success: true,
      data: {
        totalInvestment: Number(totalInvestment.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        profitLoss,
        profitLossPercent,
        asOn,
        holdings,
      },
    });
  } catch (err) {
    console.error("portfolioValue error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Portfolio history for last N days
 */
export async function portfolioHistory(req, res) {
  try {
    const userId = req.user.id;
    const portfolios = await Portfolio.find({ userId }).lean();
    if (!portfolios.length) return res.json({ success: true, data: [] });

    const schemeCodes = [...new Set(portfolios.map((p) => p.schemeCode))];
    const histories = await FundNavHistory.find({
      schemeCode: { $in: schemeCodes },
    })
      .sort({ createdAt: 1 })
      .limit(1000);

    const dateMap = {};
    histories.forEach((h) => {
      if (!dateMap[h.date]) dateMap[h.date] = 0;
      const unitsForScheme = portfolios
        .filter((p) => p.schemeCode === h.schemeCode)
        .reduce((s, x) => s + x.units, 0);
      dateMap[h.date] += unitsForScheme * h.nav;
    });

    const result = Object.keys(dateMap)
      .map((date) => ({
        date,
        totalValue: Number(dateMap[date].toFixed(2)),
      }))
      .slice(-30);

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("portfolioHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
