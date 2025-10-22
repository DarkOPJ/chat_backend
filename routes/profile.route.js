import express  from "express";
import { update_profile } from "../controllers/profile.controller.js";
import protected_route from "../middleware/protected_route.js";

const router = express.Router()

router.post("/update", protected_route, update_profile)

export default router