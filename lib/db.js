import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`Mongo DB connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`There was an error: \n${error.message}`);
  }
};

export default connectDB;
