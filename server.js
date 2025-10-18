import express from "express"
import dotenv from "dotenv"

// Route imports
import auth_router from "./routes/auth.route.js"
import message_router from "./routes/messages.route.js"

dotenv.config()
const PORT = process.env.PORT;

const app = express()

// Routes or views
app.use("/api/auth", auth_router)
app.use("/api/messages", message_router)

app.listen(PORT, () => console.log(`\nServer running on port http://localhost:${PORT}`))
