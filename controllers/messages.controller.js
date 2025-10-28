import mongoose from "mongoose";
import Message from "../models/Message.model.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";

const get_all_contacts = async (req, res) => {
  try {
    const logged_in_user = req.user._id;
    const users = await User.find({
      _id: {
        $ne: logged_in_user,
      },
    }).select("-password");
    return res.status(200).json(users);
  } catch (error) {
    console.log(
      "There was an error with the Get all chats controller: ",
      error
    );
    res.status(500).json({ message: "Internal server error." });
  }
};

const get_all_user_chats = async (req, res) => {
  try {
    const user_id = req.user._id;
    const filtered_chats = await Message.find({
      $or: [{ sender_id: user_id }, { receiver_id: user_id }],
    }).select("-password");

    const chats = [
      ...new Set(
        filtered_chats.map((chat) =>
          chat.sender_id.toString() === user_id.toString()
            ? chat.receiver_id.toString()
            : chat.sender_id.toString()
        )
      ),
    ];

    const user_chat_partners = await User.find({
      _id: { $in: chats },
    }).select("-password");
    return res.status(200).json(user_chat_partners);
  } catch (error) {
    console.log(
      "There was an error with the Get all user chats controller: ",
      error
    );
    res.status(500).json({ message: "Internal server error." });
  }
};

const get_messages_by_id = async (req, res) => {
  try {
    const chat_partner_id = req.params.id;
    const logged_in_user = req.user._id;

    if (!chat_partner_id) {
      return res.status(400).json({ message: "Invalid user provided." });
    }

    // Validate the user exists
    const existing_user = await User.exists({ _id: chat_partner_id });
    if (!existing_user) {
      return res.status(400).json({ message: "Invalid user provided." });
    }

    const messages = await Message.find({
      $or: [
        { sender_id: chat_partner_id, receiver_id: logged_in_user },
        { receiver_id: chat_partner_id, sender_id: logged_in_user },
      ],
    }).sort({ createdAt: 1 }); // Sort by time

    return res.status(200).json(messages);
  } catch (error) {
    console.log(
      "There was an error with the Get messages by id controller: ",
      error
    );
    res.status(500).json({ message: "Internal server error." });
  }
};

const send_message = async (req, res) => {
  try {
    const logged_in_user = req.user._id;
    const chat_partner_id = req.params.id;
    const { text, image } = req.body;

    if (!chat_partner_id) {
      return res.status(400).json({ message: "Invalid user provided." });
    }
    // Validate the user exists
    const existing_user = await User.exists({ _id: chat_partner_id });
    if (!existing_user) {
      return res.status(400).json({ message: "Invalid user provided." });
    }
    if (logged_in_user.equals(chat_partner_id)) {
      return res.status(400).json({ message: "You cannot message yourself." });
    }

    const processed_text = typeof text === "string" ? text.trim() : "";
    let uploaded_image;
    let image_url;

    if (!processed_text && !image) {
      return res
        .status(400)
        .json({ message: "Message must contain text or image." });
    }

    if (image) {
      uploaded_image = await cloudinary.uploader.upload(image);
      image_url = uploaded_image.secure_url;
    }

    const sent_message = await Message.create({
      sender_id: logged_in_user,
      receiver_id: chat_partner_id,
      text: processed_text,
      image: image_url,
    });

    return res.status(201).json(sent_message);
    // TODO: Use socket to show the message immediately to the receipient
  } catch (error) {
    console.log("There was an error with the Send message controller: ", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export {
  get_all_contacts,
  get_all_user_chats,
  get_messages_by_id,
  send_message,
};
