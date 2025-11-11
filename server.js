import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Route imports
import auth_router from "./routes/auth.route.js";
import normal_router from "./routes/normal.route.js";
import profile_router from "./routes/profile.route.js";
import message_router from "./routes/messages.route.js";
import ENV from "./lib/env.js";

// Database imports
import connectDB from "./lib/db.js";

const app = express();

// Middleware
app.set("trust proxy", 1); // for getting the right ip the request is coming from.. mostly for rate limiting
app.use(
  cors({
    origin: ["http://localhost:4000", "http://192.168.100.88:4000"], // must be explicit, no '*'
    credentials: true, // must match axios withCredentials:true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" })); // for collecting the request's body (req.body) of requests that come in that are formatted in JSON
// if (ENV.NODE_ENV !== "development") {
// }

// Routes or views
app.use("/", normal_router);
app.use("/api/auth", auth_router);
app.use("/api/profile", profile_router);
app.use("/api/messages", message_router);

const PORT = ENV.PORT || 3000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
