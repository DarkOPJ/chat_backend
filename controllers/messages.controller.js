import Message from "../models/Message.model.js";
import User from "../models/User.js";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import {
  estimateBase64Size,
  parseDataUri,
  decodeBase64,
  uploadToCloudinary,
} from "../lib/utils.js";
import { get_receiver_socket_id, io } from "../socket.js";

// Image property constants
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_DIMENSION = 4096; // max width/height.

const get_all_contacts = async (req, res) => {
  try {
    const logged_in_user = req.user._id;

    const filtered_chats = await Message.find({
      $or: [{ sender_id: logged_in_user }, { receiver_id: logged_in_user }],
    }).select("-password");

    const chats = [
      ...new Set(
        filtered_chats.map((chat) =>
          chat.sender_id.toString() === logged_in_user.toString()
            ? chat.receiver_id.toString()
            : chat.sender_id.toString()
        )
      ),
    ];

    const contacts_without_chat_partners = await User.find({
      _id: { $nin: chats, $ne: logged_in_user }, // users who i have not chat with before and excluding myself
    }).select("-password -profile_pic_public_id");

    return res.status(200).json(contacts_without_chat_partners);
  } catch (error) {
    console.log(
      "There was an error with the Get all contacts controller: ",
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
    }).select("-password -profile_pic_public_id");
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
    let sent_message = null;

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

    if (!processed_text && !image) {
      return res
        .status(400)
        .json({ message: "Message must contain text or image." });
    }

    if (image) {
      // Validation of Image.
      // Parse data URI
      let parsedData;
      try {
        parsedData = parseDataUri(image);
      } catch (error) {
        return res
          .status(400)
          .json({ message: "There was an error parsing the image." });
      }

      // Check estimated size before decoding
      const estimatedSize = estimateBase64Size(parsedData.base64Data);
      if (estimatedSize > MAX_FILE_SIZE) {
        return res.status(413).json({
          message: `File too large. Maximum size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        });
      }

      // Decode base64 to buffer
      let buffer;
      try {
        buffer = decodeBase64(parsedData.base64Data);
      } catch (error) {
        return res
          .status(400)
          .json({ message: "There was an error decoding image." });
      }

      // Verify actual buffer size
      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(413).json({
          message: `File too large. Maximum size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        });
      }

      // Detect actual mime type from buffer
      const fileType = await fileTypeFromBuffer(buffer);
      const detectedMime = fileType?.mime || parsedData.declaredMime;

      if (!detectedMime || !ALLOWED_TYPES.includes(detectedMime)) {
        return res.status(415).json({
          message:
            "Unsupported file type. Only PNG and JPEG images are allowed.",
        });
      }

      // Validate image with sharp and get metadata
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
      } catch (error) {
        console.error("Sharp metadata error:", error);
        return res.status(400).json({
          message: "Invalid or corrupted image file.",
        });
      }
      if (!metadata?.width || !metadata?.height) {
        return res.status(400).json({
          message: "Could not determine image dimensions.",
        });
      }
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        return res.status(413).json({
          message: `Image dimensions too large. Maximum is ${MAX_DIMENSION}x${MAX_DIMENSION}px.`,
        });
      }

      let uploadResult;
      try {
        uploadResult = await uploadToCloudinary(buffer, {
          folder: "telejam_uploads",
          public_id: `user_${logged_in_user}_image_upload_${Date.now()}`, // Unique identifier
          transformation: [
            { width: 4096, crop: "limit" },
            { quality: "auto:best" },
            { fetch_format: "auto" },
          ],
        });
      } catch (error) {
        console.error("Upload error:", error);
        return res.status(502).json({
          message: "Failed to upload image. Please try again",
        });
      }

      sent_message = await Message.create({
        sender_id: logged_in_user,
        receiver_id: chat_partner_id,
        text: processed_text,
        image: uploadResult.secure_url,
        image_public_id: uploadResult.public_id,
      });
    } else {
      sent_message = await Message.create({
        sender_id: logged_in_user,
        receiver_id: chat_partner_id,
        text: processed_text,
      });
    }

    // Use socket to show the message immediately to the receipient
    const receiver_socket_id = get_receiver_socket_id(chat_partner_id);
    if (receiver_socket_id) {
      io.to(receiver_socket_id).emit("sent_message", sent_message);
    }

    return res.status(201).json(sent_message);
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
