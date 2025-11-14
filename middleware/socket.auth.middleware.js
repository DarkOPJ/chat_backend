import jwt from "jsonwebtoken";
import ENV from "../lib/env.js";
import User from "../models/User.js";

const socket_auth_middleware = async (socket, next) => {
  try {
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((row) => row.startsWith("jwt="))
      ?.split("=")[1];

    if (!token) {
      console.log("\nSocket connection rejected: No authentication token.");
      return next(new Error("Unauthorized access."));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded.user_id) {
      console.log("\nSocket connection rejected: Invalid token.");
      return next(new Error("Unauthorized access."));
    }

    const user = await User.findById(decoded.user_id).select("-password");
    if (!user) {
      console.log("\nSocket connection rejected: User not found.");
      return next(new Error("Unauthorized access."));
    }

    socket.user = user;
    socket.user_id = user._id.toString();
    console.log(`\nSocket authenticated for ${user.full_name} - ID ${user._id}`);
    next();
  } catch (error) {
    console.log("Socket authentication error: ", error.message);
    return next(new Error("Authentication failed. Unauthorized access."));
  }
};

export default socket_auth_middleware;
