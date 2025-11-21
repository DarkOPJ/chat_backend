import Message from "../models/Message.model.js";
import User from "../models/User.js";
import ENV from "./env.js";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are Orion, Telejam's AI assistant. Telejam is a modern, upcoming messaging app designed for seamless communication.

Core Personality:
- Keep responses SHORT and conversational (1-3 sentences unless asked for more)
- Match the user's energy and tone - be casual with casual users, professional when needed
- Be helpful, friendly, and cool - like texting a knowledgeable friend

Communication Style:
- Default to brief, punchy responses (1-3 sentences max)
- Only elaborate when user asks "explain more", "tell me more", or asks detailed questions
- Use line breaks for readability in longer responses
- Avoid corporate/robotic language - sound human
- Never say "as an AI" or mention your limitations unless directly relevant
- Do NOT ask questions at the end of every message - respond naturally like in a real conversation
- When suggesting a topic, share YOUR thoughts first, then let the conversation flow naturally
- Use emojis sparingly - maximum 3 per message, and only when they genuinely add value
- Many responses should have NO emojis - use them for emphasis, humor, or emotion, not decoration
- Respond to what the user says without always prompting for more - conversations aren't interviews

Emoji examples:
WITH emojis (good use):
- "That's hilarious 🤣🤣"
- "Let's gooo 🔥"
- "Congrats on the launch! 🎉🚀"

WITHOUT emojis (also good):
- "Nice, programming's a solid grind."
- "Yeah that makes sense."
- "The rich and chill life takes time but you're building toward it."
- "Makes sense. Keep pushing."

Image Analysis:
- When user sends an image, analyze it thoroughly
- Answer specific questions about the image
- If no question, provide a brief, helpful description
- Point out interesting or important details
- For memes/screenshots, understand context and humor

Boundaries:
- Don't make up facts - admit when you're unsure
- Redirect harmful requests politely
- Stay on topic and helpful

Current context: You're chatting in a 1-on-1 conversation. Keep it natural and engaging. 💬`;

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

const is_ai_user = async (userId) => {
  const user = await User.findById(userId);
  return user._id.toString() === ENV.AI_USER_ID;
};

const build_ai_context = async (user_id, ai_user_id) => {
  // Fetch last 20 messages
  const messages = await Message.find({
    $or: [
      { sender_id: user_id, receiver_id: ai_user_id },
      { sender_id: ai_user_id, receiver_id: user_id },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (!messages || messages.length === 0) {
    return [];
  }

  return messages.reverse().map((msg) => {
    const content = [];

    // Add text (if any)
    if (msg.text) {
      content.push({
        type: "text",
        text: msg.text,
      });
    }

    // Add image (if any)
    if (msg.image) {
      content.push({
        type: "image_url",
        image_url: {
          url: msg.image,
        },
      });
    }

    return {
      role:
        msg.sender_id.toString() === ai_user_id.toString()
          ? "assistant"
          : "user",
      content,
    };
  });
};

const stream_ai_response = async (
  user_message,
  context,
  user_id,
  ai_user_id,
  user_socket
) => {
  if (!Array.isArray(context)) {
    context = [];
  }

  const content = [];

  // Add text if it exists
  if (user_message.text) {
    content.push({ type: "text", text: user_message.text });
  }

  // Add image if it exists
  if (user_message.image) {
    content.push({
      type: "image_url",
      image_url: {
        url: user_message.image,
      },
    });
  }
  
  const stream = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...context,
      {
        role: "user",
        content: content,
      },
    ],
    stream: true,
  });

  let full_response = "";
  const temp_message_id = `ai-temp-${Date.now()}`;

  // Stream each chunk
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";

    if (content) {
      full_response += content;

      // Emit only if socket exists
      if (user_socket && typeof user_socket.emit === "function") {
        user_socket.emit("ai_message_chunk", {
          message_id: temp_message_id,
          chunk: content,
          full_text: full_response,
          is_complete: false,
          sender_id: ai_user_id,
          receiver_id: user_id,
        });
      }
    }
  }

  // Save complete message to database
  const ai_message = await Message.create({
    sender_id: ai_user_id,
    receiver_id: user_id,
    text: full_response,
    is_ai_message: true,
  });

  return ai_message;
};

export { is_ai_user, build_ai_context, stream_ai_response };
