import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  addToPortfolio,
  listPortfolio,
  removeFromPortfolio,
  portfolioValue,
  portfolioHistory,
} from "../controllers/portfolioController.js";
import { portfolioUpdateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use(authenticate);

router.post("/add", portfolioUpdateLimiter, addToPortfolio);
router.get("/list", listPortfolio);
router.get("/value", portfolioValue);
router.get("/history", portfolioHistory);
router.delete("/remove/:schemeCode", removeFromPortfolio);

export default router;
