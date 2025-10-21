import express  from "express";
import { update_profile } from "../controllers/profile.controller";

const router = express.Router()

router.get("/update", ,update_profile)

export default router