import jwt from "jsonwebtoken"
import ENV from "../lib/env.js"

const protected_route = await (req, res, next) => {
  try {
    const token = req.cookies.jwt

    try{
        if (!token) {
            return res.status(401).json({message: "Unauthorized access."})
        }

        user_id = await jwt.verify(token, ENV.JWT_SECRET)
        if
    }
  } catch (error) {
    console.log(
      "There was a problem with the route protection middleware: \n",
      error
    );
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export default protected_route;
