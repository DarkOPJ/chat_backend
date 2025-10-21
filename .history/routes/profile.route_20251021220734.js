import express  from "express";

const router = express.Router()

router.get("/update", (req, res) => {
    res.json({message: ""})
})

export default router