import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";
import { generate_and_send_jwt } from "../lib/utils.js";
import { send_welcome_email } from "../emails/email_handlers.js";

dotenv.config();

const signup = async (req, res) => {
  const { full_name, email, password } = req.body;
  const processed_full_name =
    typeof full_name === "string" ? full_name.trim() : "";
  const processed_email =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const processed_password = typeof password === "string" ? password : "";

  try {
    if (!processed_full_name || !processed_email || !processed_password) {
      // Always remember to send the status before the sending the json else it won't work
      // for this place the status code is fine since it cant be used to figure out anything in the db or app
      return res.status(400).json({ message: "All fields are required." });
    }

    const email_regex =
      /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email_regex.test(processed_email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const password_regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
    if (!password_regex.test(processed_password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
      });
    }

    // If a user already exists send a generic message like "Unable to process your signup request. Please verify your information and try again."
    // Then send an email to the person whose email is being used to signup “If you tried to sign up, ignore this. If not, someone attempted to register using your email.”
    const existing_user = await User.findOne({ email: processed_email });
    if (existing_user) {
      return res.status(400).json({
        message:
          "Unable to process your signup request. Please verify your information and try again.",
      });
    }

    // you can equally use one line instead of 2 with const hashed_password = await bcrypt.hash(password, 10)
    const salt = await bcrypt.genSalt(10);
    const hashed_password = await bcrypt.hash(processed_password, salt);

    const new_user = await User.create({
      full_name: processed_full_name,
      email: processed_email,
      password: hashed_password,
    });

    if (new_user) {
      generate_and_send_jwt(new_user._id, res);

      //   TODO: Send a welcome email to the user
      try {
        await send_welcome_email(
          new_user.email,
          new_user.full_name,
          process.env.CLIENT_URL
        );
      } catch (error) {
        console.log("There was an error sending the email: ", error);
      }

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
    console.log("Something went wrong with the user Signu Up: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const processed_email =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const processed_password = typeof password === "string" ? password : "";

  // Dummy hash to prevent timing differences when user not found
  const dummyHash =
    "$2b$10$C9y5EXAMPLEaDummyHashStringe0QWfL9WvslFSk0L6KzZgVkk9hu";

  try {
    if (!processed_email || !processed_password) {
      return res.status(200).json({ message: "Invalid email or password." });
    }

    const email_regex =
      /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email_regex.test(processed_email)) {
      return res.status(200).json({ message: "Invalid email or password." });
    }

    const password_regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
    if (!password_regex.test(processed_password)) {
      return res.status(200).json({ message: "Invalid email or password." });
    }

    const existing_user = await User.findOne({ email: processed_email });

    // Always call bcrypt.compare with *some* hash
    const hash_to_compare = existing_user ? existing_user.password : dummyHash;

    const password_check = await bcrypt.compare(
      processed_password,
      hash_to_compare
    );

     // Add a small fixed delay (e.g., 300–500 ms)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Return same response message to avoid user enumeration
    if (!existing_user || !password_check) {
      return res.status(200).json({ message: "Invalid email or password." });
    }

    generate_and_send_jwt(existing_user._id, res);
    return res.status(200).json({
      full_name: existing_user.full_name,
      email: existing_user.email,
      profile_pic: existing_user.profile_pic,
    });
  } catch (error) {
    console.log("Something went wrong with the user Login: ", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};


const logout = (req, res) => {
  const cookie_options = {
    sameSite: "strict",
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
  };
  res.clearCookie("jwt", cookie_options);
  return res.status(200).json({ message: "Logged out successfully." });
};

export { signup, login, logout };
