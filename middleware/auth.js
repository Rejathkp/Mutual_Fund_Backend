import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  if (!header)
    return res
      .status(401)
      .json({ success: false, message: "Authorization header missing" });
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res
      .status(401)
      .json({ success: false, message: "Invalid Authorization format" });
  }
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

export function authorizeRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    if (req.user.role !== requiredRole)
      return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };
}
