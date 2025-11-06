import mongoose from "mongoose";

const User_Schema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
    },
    username: {
      type: String,
      // TODO
      // unique: true,
      default: "",
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
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", User_Schema);

export default User;
