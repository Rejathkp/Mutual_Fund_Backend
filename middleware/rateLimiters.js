import rateLimit from "express-rate-limit";

// Login limiter by IP (not JWT)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts, try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General per-user limiter factory
export const perUserLimiter = (max, windowMs = 60 * 1000) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // If authenticated use user id, else IP
      if (req.user && req.user.id) return String(req.user.id);
      return req.ip;
    },
    handler: (req, res) =>
      res
        .status(429)
        .json({ success: false, message: "Too many requests, slow down." }),
    standardHeaders: true,
    legacyHeaders: false,
  });

// Pre-configured
export const apiLimiter = perUserLimiter(100, 60 * 1000); // 100/min per user
export const portfolioUpdateLimiter = perUserLimiter(10, 60 * 1000); // 10/min per user
