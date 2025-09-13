import express from "express";
import { authenticate, authorizeRole } from "../middleware/auth.js";
import {
  listUsers,
  listAllPortfolios,
  popularFunds,
  systemStats,
} from "../controllers/adminController.js";

const router = express.Router();
router.use(authenticate);
router.use(authorizeRole("admin"));

router.get("/users", listUsers);
router.get("/portfolios", listAllPortfolios);
router.get("/popular-funds", popularFunds);
router.get("/stats", systemStats);

export default router;
