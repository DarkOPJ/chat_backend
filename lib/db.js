import mongoose from "mongoose";
import ENV from "./env.js";

const connectDB = async () => {
  try {
    if (!ENV.MONGODB_URI)
      throw new Error("MONGODB_URI is not configured.");

    mongoose.set("strictQuery", false);

    const conn = await mongoose.connect(ENV.MONGODB_URI);

    console.log(`Mongo DB connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`There was an error: \n${error.message}`);
    throw error;
  }
};

export default connectDB;