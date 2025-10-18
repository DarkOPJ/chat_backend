import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Route imports
import auth_router from "./routes/auth.route.js";
import message_router from "./routes/messages.route.js";

dotenv.config();

const app = express();

app.use(cors());

// Routes or views
app.use("/api/auth", auth_router);
app.use("/api/messages", message_router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
