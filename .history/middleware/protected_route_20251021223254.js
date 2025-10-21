import jwt from "jsonwebtoken";
import ENV from "../lib/env.js";
import User from "../models/User.js";

const protected_route = async (req, res, next) => {
  const token = req.cookies.jwt;

  try {
    if (!token) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    user_id = jwt.verify(token, ENV.JWT_SECRET);
    if (!user_id) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const user = await User.findById(user_id).select("-password")
    if (!user) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    req.user = user
    

  } catch (error) {
    console.log(
      "There was a problem with the route protection middleware: \n",
      error
    );
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export default protected_route;
