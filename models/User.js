import mongoose from "mongoose";

const User_Schema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 20,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 16,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },
    profile_pic: {
      type: String,
      default: "",
    },
    profile_pic_public_id: {
      type: String,
      default: "",
    },
    last_seen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", User_Schema);

export default User;
