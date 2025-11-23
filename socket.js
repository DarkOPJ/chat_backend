import { Server } from "socket.io";
import http from "http";
import express from "express";
import ENV from "./lib/env.js";
import socket_auth_middleware from "./middleware/socket.auth.middleware.js";
import User from "./models/User.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL, "http://localhost:4173", "http://localhost:4000"],
    credentials: true,
  },
});

// Authentication middleware for socket connections.
io.use(socket_auth_middleware);

// Storing online users or socket connections.
const user_socket_map = {}; // {user_id: socket_id}.

// Check if user is online for receiving a message
const get_receiver_socket_id = (user_id) => {
  return user_socket_map[user_id];
};

// Listen to events using io.on().
// It takes event name and a callback function to do something when it gets a connection.
io.on("connection", (socket) => {
  console.log("User connected. ", socket.user.full_name);

  const user_id = socket.user_id;
  user_socket_map[user_id] = socket.id;

  // Send an event to all clients using io.emit().
  // It takes an event name, and whatever you want to send to the clients.
  // Always include AI in online users
  const online_user_ids = [...Object.keys(user_socket_map), ENV.AI_USER_ID];
  io.emit("get_all_online_users", online_user_ids);

  // Add typing listener here
  socket.on("user_typing", (data) => {
    const receiver_socket_id = get_receiver_socket_id(data.to);
    if (receiver_socket_id) {
      // console.log("typing socket")
      io.to(receiver_socket_id).emit("user_typing", {
        from: socket.user_id,
        is_typing: data.is_typing,
      });
    }
  });

  // Listen for events from a connected client with socket.on().
  // It takes an event name and callback function.
  // We used io.on() to listen for socket connection itself. Now that we have the socket connection we listen for events on that connection.
  socket.on("disconnect", async () => {
    console.log("User disconnected. ", socket.user.full_name);

    const user_id = socket.user_id;
    delete user_socket_map[user_id];

    // Update last_seen in database
    try {
      await User.findByIdAndUpdate(user_id, { last_seen: new Date() });
    } catch (error) {
      console.error("Failed to update last_seen:", error);
    }

    // Always include AI in online users
    const online_user_ids = [...Object.keys(user_socket_map), ENV.AI_USER_ID];
    io.emit("get_all_online_users", online_user_ids);
  });
});

export { app, io, server, get_receiver_socket_id };
