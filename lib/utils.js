import jwt from "jsonwebtoken";
import ENV from "./env.js";

const generate_and_send_jwt = (user_id, res) => {
  if (!ENV.JWT_SECRET) throw new Error("JWT secret is not configured.");

  const jwt_token = jwt.sign({ user_id }, ENV.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("jwt", jwt_token, {
    maxAge: 60 * 60 * 1000, // 1 hour. Should match the expires in
    httpOnly: true,
    sameSite: "strict",
    secure: ENV.NODE_ENV !== "development",
  });

  return jwt_token;
};

export { generate_and_send_jwt };