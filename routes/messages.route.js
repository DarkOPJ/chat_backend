import express from "express";

const router = express.Router();

router.get("/send", (req, res) => {
  res.send("This is a message");
});

// You can add more routes here, e.g., POST to create a message

export default router;
