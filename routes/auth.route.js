import express from "express";
import {
  auth_check,
  login,
  logout,
  signup,
  check_name_and_email,
  check_email,
} from "../controllers/auth.controller.js";
import {
  login_rate_limit,
  signup_rate_limit,
} from "../middleware/ip_rate_limit.js";
import protected_route from "../middleware/protected_route.js";

const router = express.Router();

// Signup page
router.post("/signup_check", signup_rate_limit, check_name_and_email);
router.post("/signup", signup_rate_limit, signup);

// Login page
router.post("/login_check", check_email);
router.post("/login", login);
// router.post("/login_check", login_rate_limit, check_email);
// router.post("/login", login_rate_limit, login);

// Logout page
router.post("/logout", logout);

// Check if user is. authenticated
router.get("/check", protected_route, auth_check);

export default router;
