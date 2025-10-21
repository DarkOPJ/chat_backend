import express  from "express";
import { update_profile } from "../controllers/profile.controller.js";

const router = express.Router()

router.get("/update", update_profile)

export default router