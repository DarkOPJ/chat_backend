import rateLimit from "express-rate-limit";

const login_rate_limit = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  // windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 3, // Max 10 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

const signup_rate_limit = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  // windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Max 10 login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

export { login_rate_limit, signup_rate_limit };
