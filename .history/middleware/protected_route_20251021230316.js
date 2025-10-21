import jwt from "jsonwebtoken";
import ENV from "../lib/env.js";
import User from "../models/User.js";

const protected_route = async (req, res, next) => {
  const token = req.cookies.jwt;

  try {
    if (!token) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded.user_id) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const user = await User.findById(decoded.user_id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    console.error("Route protection middleware error:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
  }
};

export default protected_route;
