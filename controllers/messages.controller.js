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
import Conversation from "../models/Conversations.model.js";
import {
  build_ai_context,
  is_ai_user,
  stream_ai_response,
} from "../lib/ai_utils.js";

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

    const conversations = await Conversation.find({
      participants: user_id,
    })
      .populate("participants", "-password -profile_pic_public_id")
      .sort({ updatedAt: -1 }); // Most recent first

    // Filter out the current user from participants to get chat partners
    const formatted_conversations = conversations.map((conv) => {
      const partner = conv.participants.find(
        (p) => p._id.toString() !== user_id.toString()
      );

      return {
        _id: conv._id,
        partner: partner,
        last_message: conv.last_message,
        updated_at: conv.updatedAt,
        unread_count: conv.unread_count.get(user_id.toString()) || 0, 
      };
    });

    return res.status(200).json(formatted_conversations);
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
    let uploadResult;

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

    // Validating the image.
    if (image) {
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
    }

    const is_ai_chat = await is_ai_user(chat_partner_id);

    if (is_ai_chat) {
      // Save user message
      const user_message = await Message.create({
        sender_id: logged_in_user,
        receiver_id: chat_partner_id,
        text: processed_text,
        image: image ? uploadResult.secure_url : null,
        image_public_id: image ? uploadResult.public_id : null,
      });

      // Create/update conversation with user's message first
      let conversation = await Conversation.findOneAndUpdate(
        { participants: { $all: [logged_in_user, chat_partner_id] } },
        {
          $set: {
            last_message: {
              sender_id: user_message.sender_id,
              text: user_message.text,
              image: user_message.image,
              createdAt: user_message.createdAt,
            },
          },
          $setOnInsert: {
            participants: [logged_in_user, chat_partner_id],
          },
        },
        { upsert: true, new: true }
      );

      // Get conversation history
      const context = await build_ai_context(logged_in_user, chat_partner_id);

      // Get user's socket
      const user_socket_id = get_receiver_socket_id(logged_in_user);
      const user_socket = io.sockets.sockets.get(user_socket_id);

      // Stream AI response in background
      stream_ai_response(
        user_message.text,
        // user_message.image, // Pass image URL for vision
        context,
        logged_in_user,
        chat_partner_id,
        user_socket
      ).then(async (ai_message) => {
        // Update conversation with AI's message
        conversation = await Conversation.findOneAndUpdate(
          { participants: { $all: [logged_in_user, chat_partner_id] } },
          {
            $set: {
              last_message: {
                sender_id: ai_message.sender_id,
                text: ai_message.text,
                image: ai_message.image,
                createdAt: ai_message.createdAt,
              },
            },
          },
          { new: true }
        );

        // Emit completion
        if (user_socket) {
          user_socket.emit("ai_message_complete", {
            final_message: ai_message,
            conversation: conversation,
          });
        }
      });

      // Return immediately with user's message
      return res.status(201).json({ sent_message: user_message, conversation });
    }

    const sent_message = await Message.create({
      sender_id: logged_in_user,
      receiver_id: chat_partner_id,
      text: processed_text,
      image: image ? uploadResult.secure_url : null,
      image_public_id: image ? uploadResult.public_id : null,
    });

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [logged_in_user, chat_partner_id] },
    });

    if (conversation) {
      // Update existing conversation
      conversation.last_message = {
        sender_id: sent_message.sender_id,
        text: sent_message.text,
        image: sent_message.image,
        createdAt: sent_message.createdAt,
      };

      // Increment unread count for receiver
      const current_count =
        conversation.unread_count.get(chat_partner_id.toString()) || 0;
      conversation.unread_count.set(
        chat_partner_id.toString(),
        current_count + 1
      );

      await conversation.save();
    } else {
      // Create new conversation
      const unread_map = new Map();
      unread_map.set(chat_partner_id.toString(), 1); // Receiver has 1 unread
      unread_map.set(logged_in_user.toString(), 0); // Sender has 0 unread

      conversation = await Conversation.create({
        participants: [logged_in_user, chat_partner_id],
        last_message: {
          sender_id: sent_message.sender_id,
          text: sent_message.text,
          image: sent_message.image,
          createdAt: sent_message.createdAt,
        },
        unread_count: unread_map,
      });
    }

    // Use socket to show the message immediately to the receipient
    const receiver_socket_id = get_receiver_socket_id(chat_partner_id);

    if (receiver_socket_id) {
      // For notifications (chat closed)
      io.to(receiver_socket_id).emit("new_message", {
        sent_message,
        conversation,
        sender: req.user,
      });

      // For live chat (chat open) - mark as read
      io.to(receiver_socket_id).emit("sent_message", {
        // sent_message: sent_message,
        sent_message: { ...sent_message.toObject(), is_read: true },
      });
    }

    return res.status(201).json({ sent_message, conversation });
  } catch (error) {
    console.log("There was an error with the Send message controller: ", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const mark_messages_as_read = async (req, res) => {
  try {
    const user_id = req.user._id;
    const { id: conversation_id } = req.params;

    const conversation = await Conversation.findById(conversation_id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const sender_id = conversation.participants.find(
      (p) => p.toString() !== user_id.toString()
    );

    await Conversation.findByIdAndUpdate(conversation_id, {
      $set: { [`unread_count.${user_id}`]: 0 },
    });

    await Message.updateMany(
      {
        receiver_id: user_id,
        sender_id: sender_id,
        is_read: false,
      },
      { $set: { is_read: true } }
    );

    // Emit to sender that messages were read
    const sender_socket_id = get_receiver_socket_id(sender_id);
    if (sender_socket_id) {
      io.to(sender_socket_id).emit("messages_marked_as_read", {
        conversation_id: conversation_id,
        reader_id: user_id,
      });
    }

    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  get_all_contacts,
  get_all_user_chats,
  get_messages_by_id,
  send_message,
  mark_messages_as_read,
};
