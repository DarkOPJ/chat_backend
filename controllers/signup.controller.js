import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generate_and_send_jwt } from "../lib/utils.js";

const signup = async (req, res) => {
  const { full_name, email, password } = req.body;
  const processed_full_name = typeof email === "string" ? email.trim() : "";
  const processed_email =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const processed_password = typeof password === "string" ? password : "";

  try {
    if (!full_name || !email || !password) {
      // Always remember to send the status before the sending the json else it won't work
      // for this place the status code is fine since it cant be used to figure out anything in the db or app
      return res.status(400).json({ message: "All fields are required." });
    }

    const email_regex =
      /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email_regex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const password_regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
    if (!password_regex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
      });
    }

    // If a user already exists send a generic message like "Unable to process your signup request. Please verify your information and try again."
    // Then send an email to the person whose email is being used to signup “If you tried to sign up, ignore this. If not, someone attempted to register using your email.”
    const existing_user = await User.findOne({ email });
    if (existing_user) {
      return res.status(400).json({
        message:
          "Unable to process your signup request. Please verify your information and try again.",
      });
    }

    // you can equally use one line instead of 2 with const hashed_password = await bcrypt.hash(password, 10)
    const salt = await bcrypt.genSalt(10);
    const hashed_password = await bcrypt.hash(password, salt);

    const new_user = await User.create({
      full_name,
      email,
      password: hashed_password,
    });

    if (new_user) {
      generate_and_send_jwt(new_user._id, res);

      //   TODO: Send a welcome email to the user

      return res.status(201).json({
        _id: new_user._id,
        full_name: new_user.full_name,
        email: new_user.email,
        profile_pic: new_user.profile_pic,
      });
    } else {
      return res.status(400).json({ message: "Invalid user data." });
    }
  } catch (error) {
    console.log("Something went wrong with the user Signu Up.");
    return res.status(500).json({ message: "Internal server error." });
  }
};

export default signup;
