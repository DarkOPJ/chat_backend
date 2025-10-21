import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Route imports
import auth_router from "./routes/auth.route.js";
import normal_router from "./routes/normal.route.js";
import message_router from "./routes/messages.route.js";

// Database imports
import connectDB from "./lib/db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json()); // for collecting the request's body (req.body) of requests that come in that are formatted in JSON
app.set('trust proxy', 1); // for getting the right ip the request is coming from.. mostly for rate limiting



// Routes or views
app.use("/", normal_router);
app.use("/api/auth", auth_router);
app.use("/api/profile", );
app.use("/api/messages", message_router);

const PORT = process.env.PORT || 3000;

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
