import mongoose from "mongoose";

const Conversation_Schema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    last_message: {
      text: {
        type: String,
        default: "",
      },
      sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      image: {
        type: String,
        default: null,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    unread_count: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
Conversation_Schema.index({ participants: 1 });
Conversation_Schema.index({ updatedAt: -1 });

const Conversation = mongoose.model("Conversation", Conversation_Schema);

export default Conversation;
