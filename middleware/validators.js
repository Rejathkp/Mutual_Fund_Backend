import { body, validationResult } from "express-validator";

export const validateSignup = [
  body("name").trim().isLength({ min: 2 }).withMessage("Name too short"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/)
    .withMessage(
      "Password must have 8 chars, upper, lower, number & special char"
    ),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      return res.status(400).json({ success: false, errors: errs.array() });
    }
    next();
  },
];

export const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").exists().withMessage("Password required"),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      return res.status(400).json({ success: false, errors: errs.array() });
    }
    next();
  },
];
