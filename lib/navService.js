import axios from "axios";
import cron from "node-cron";
import Portfolio from "../models/Portfolio.js";
import FundLatestNav from "../models/FundLatestNav.js";
import FundNavHistory from "../models/FundNavHistory.js";
import Fund from "../models/Fund.js";

const MFAPI_BASE = process.env.MFAPI_BASE || "https://api.mfapi.in/mf";

/* Exponential backoff helper */
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchLatestNavFromApi(schemeCode, attempt = 1) {
  const maxAttempts = 5;
  try {
    const url = `${MFAPI_BASE}/${schemeCode}/latest`;
    const res = await axios.get(url, { timeout: 10000 });

    if (!res || !res.data) throw new Error("Invalid API response");

    const payload = res.data;

    let navEntry = null;
    if (payload.data && payload.data.data) {
      // nested
      navEntry = payload.data.data[0] || payload.data.data;
    } else if (payload.data && Array.isArray(payload.data)) {
      navEntry = payload.data[0];
    } else if (payload.data && payload.data.nav) {
      navEntry = payload.data;
    } else if (
      payload.data &&
      payload.data.totalRecords &&
      payload.data.totalRecords > 0
    ) {
      navEntry = payload.data.data?.[0];
    } else {
      // fallback: if payload has 'meta' and 'data'
      navEntry = payload.data || payload;
    }

    if (!navEntry) throw new Error("NAV entry not found in API response");

    // nav may come as string; convert
    const nav = parseFloat(navEntry.nav || navEntry["nav"]);
    const date = navEntry.date || navEntry["date"];

    if (Number.isNaN(nav)) throw new Error("NAV not numeric");

    return { nav, date };
  } catch (err) {
    if (attempt < maxAttempts) {
      const backoff = 500 * Math.pow(2, attempt - 1);
      await sleep(backoff);
      return fetchLatestNavFromApi(schemeCode, attempt + 1);
    }
    throw err;
  }
}

export async function updateLatestNAV(schemeCode) {
  const ret = { schemeCode, success: false };
  try {
    const { nav, date } = await fetchLatestNavFromApi(schemeCode);
    // Update latest collection
    await FundLatestNav.findOneAndUpdate(
      { schemeCode },
      { nav, date, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    // Add to history if not duplicate for same date
    const exists = await FundNavHistory.findOne({ schemeCode, date });
    if (!exists) {
      await FundNavHistory.create({ schemeCode, nav, date });
    }
    ret.success = true;
    ret.nav = nav;
    ret.date = date;
    return ret;
  } catch (err) {
    ret.error = err.message;
    return ret;
  }
}

/* Cron scheduler: daily update for all schemeCodes present in portfolios */
export function scheduleDailyNavUpdate() {
  const schedule = process.env.CRON_SCHEDULE || "0 0 * * *";
  console.log(`⏰ Scheduling daily NAV update: '${schedule}'`);
  cron.schedule(schedule, async () => {
    console.log("Starting daily NAV update job...");
    try {
      const schemeCodes = await Portfolio.distinct("schemeCode");
      for (const code of schemeCodes) {
        const r = await updateLatestNAV(code);
        if (r.success) {
          console.log(`Updated NAV for ${code}: ${r.nav} (${r.date})`);

          try {
            const fundExists = await Fund.findOne({ schemeCode: code });
            if (!fundExists) {
              // Fetch fund meta from mfapi
              const info = await axios.get(`${MFAPI_BASE}/${code}`);
              const payload = info.data;
              // Attempt to read scheme name
              const schemeName =
                payload.data?.meta?.scheme_name ||
                payload.meta?.scheme_name ||
                payload.data?.schemeName ||
                payload.schemeName ||
                (payload.data &&
                  payload.data[0] &&
                  payload.data[0].schemeName) ||
                null;
              if (schemeName) {
                await Fund.create({ schemeCode: Number(code), schemeName });
              }
            }
          } catch (e) {
            // ignore fund meta failures
          }
        } else {
          console.error(
            `Failed update for ${code}: ${r.error || "unknown error"}`
          );
        }
      }
      console.log("Daily NAV update job completed.");
    } catch (err) {
      console.error("NAV update job error:", err.message);
    }
  });
}
