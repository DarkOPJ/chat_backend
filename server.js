import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

// Route imports
import auth_router from "./routes/auth.route.js";
import normal_router from "./routes/normal.route.js";
import profile_router from "./routes/profile.route.js";
import message_router from "./routes/messages.route.js";
import arcjet_protection from "./middleware/arcjet.middleware.js";

// Database imports
import connectDB from "./lib/db.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json()); // for collecting the request's body (req.body) of requests that come in that are formatted in JSON
if (process.env.NODE_ENV !== "development") {
  app.set("trust proxy", 1); // for getting the right ip the request is coming from.. mostly for rate limiting
}
app.use(arcjet_protection); // for rate limit protection against users and bots, stop SQLi and some other security vulnerabilities

// Routes or views
app.use("/", normal_router);
app.use("/api/auth", auth_router);
app.use("/api/profile", profile_router);
app.use("/api/messages", message_router);

const PORT = process.env.PORT || 3000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// for vercel
// export default app
