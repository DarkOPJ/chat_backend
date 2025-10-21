import express  from "express";

const router = express.Router()

router.get("/update", (req, res) => {
    res.json({menubar})
})

export default router