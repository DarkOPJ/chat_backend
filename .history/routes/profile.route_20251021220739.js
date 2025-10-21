import express  from "express";

const router = express.Router()

router.get("/update", (req, res) => {
    res.json({message: "Youve been authenticated"})
})

export default router