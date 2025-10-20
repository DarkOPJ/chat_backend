import express from "express";
import signup from "../controllers/signup.controller.js";

const router = express.Router();

// Signup page
router.post("/signup", signup);

// Login page
router.get("/login", (req, res) => {
  res.send("Login page");
});

// Logout page
router.get("/logout", (req, res) => {
  res.send("Logout page");
});

export default router;