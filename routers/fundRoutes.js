import express from "express";
import { listFunds, getFundNavHistory } from "../controllers/fundController.js";

const router = express.Router();

router.get("/", listFunds); // /api/funds?search=&page=&limit=
router.get("/:schemeCode/history", getFundNavHistory);

export default router;
