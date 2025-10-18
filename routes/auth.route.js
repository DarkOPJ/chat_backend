import express from "express";

const router = express.Router();

// Signup page
router.get("/signup", (req, res) => {
  res.send("Signup page");
});

// Login page
router.get("/login", (req, res) => {
  res.send("Login page");
});

// Logout page
router.get("/logout", (req, res) => {
  res.send("Logout page");
});

export default router;
