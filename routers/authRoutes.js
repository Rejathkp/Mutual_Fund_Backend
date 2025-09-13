import express from "express";
import { signup, login } from "../controllers/authController.js";
import { loginLimiter } from "../middleware/rateLimiters.js";
import { validateSignup, validateLogin } from "../middleware/validators.js";

const router = express.Router();

router.post("/signup", validateSignup, signup);

router.post("/login", loginLimiter, validateLogin, login);

export default router;
