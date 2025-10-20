import jwt from "jsonwebtoken";

const generate_and_send_jwt = (user_id, res) => {
  const jwt_token = jwt.sign({ user_id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("jwt", jwt_token, {
    maxAge: 60 * 60 * 1000, // 1 hour. Should match the expires in
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "development" ? "false" : "true",
  });

  return jwt_token;
};

export { generate_and_send_jwt };
