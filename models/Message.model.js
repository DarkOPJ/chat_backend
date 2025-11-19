import mongoose from "mongoose";

const Message_Schema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    image_public_id: {
      type: String,
    },
    is_ai_message: {
      type: Boolean,
      default: false,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", Message_Schema);

export default Message;
