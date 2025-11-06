import express  from "express";
import { update_profile_pic, delete_profile_pic, update_profile_info } from "../controllers/profile.controller.js";
import protected_route from "../middleware/protected_route.js";

const router = express.Router()

router.put("/update_profile_pic", protected_route, update_profile_pic)
router.put("/update_profile_info", protected_route, update_profile_info)
router.delete("/delete_profile_pic", protected_route, delete_profile_pic)

export default router