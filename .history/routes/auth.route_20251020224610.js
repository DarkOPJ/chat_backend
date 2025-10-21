import express from "express";
import { login, logout, signup } from "../controllers/auth.controller.js";
import { login_rate_limit, signup_rate_limit } from "../lib/ip_rate_limit.js";

const router = express.Router();

// Signup page
router.post("/signup", signup_rate_limit, signup);

// Login page
router.post("/login", login_rate_limit, login);

// Logout page
router.post("/logout", logout);

export default router;
