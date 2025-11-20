import express from "express";
import protected_route from "../middleware/protected_route.js";
import {
  get_all_user_chats,
  get_all_contacts,
  get_messages_by_id,
  send_message,
  mark_messages_as_read
} from "../controllers/messages.controller.js";
import arcjet_protection from "../middleware/arcjet.middleware.js";

const router = express.Router();
// arcjet_protection
router.use(protected_route);
router.get("/contacts", get_all_contacts);
router.get("/chats", get_all_user_chats);
router.get("/:id", get_messages_by_id);
router.post("/send/:id", send_message);
router.post("/:id/mark-read", mark_messages_as_read);

export default router;
