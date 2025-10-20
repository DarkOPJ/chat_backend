import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  CLIENT_URL: process.env.CLIENT_URL,
};
export default ENV;

// PORT=3000
// MONGODB_URI=mongodb+srv://professionaljeffb:LRzGCRBE6V8BDSH7@cluster0.wpzt9.mongodb.net/chat_app
// JWT_SECRET=b8d2f9a5e3c7b6a4e8f2a1b5d9f7c3a6e4b2f8a5d1e9c6f7a4b3e2d5f9c7a8b4e6
// NODE_ENV=development
// RESEND_API_KEY=re_cAAiYc3v_NWZGjzeeFuh7JdBensSEX1rW

// EMAIL_FROM_ADDRESS="support@resend.dev"
// EMAIL_FROM_NAME="Chat App Support"
// CLIENT_URL=http://localhost:3000
