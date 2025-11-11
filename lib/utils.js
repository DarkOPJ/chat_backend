import jwt from "jsonwebtoken";
import cloudinary from "../lib/cloudinary.js";
import { fileTypeFromBuffer } from "file-type";

import ENV from "./env.js";

// JWT generator
const generate_and_send_jwt = (user_id, res) => {
  if (!ENV.JWT_SECRET) throw new Error("JWT secret is not configured.");

  const jwt_token = jwt.sign({ user_id }, ENV.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.cookie("jwt", jwt_token, {
    maxAge: 60 * 60 * 1000, // 1 hour. Should match the expires in
    httpOnly: true,
    sameSite: "strict",
    secure: ENV.NODE_ENV !== "development",
  });

  return jwt_token;
};

// Image validation, transformation and uploading
const estimateBase64Size = (base64str) => {
  const len = base64str.length;
  let padding = 0;
  if (base64str.endsWith("==")) padding = 2;
  else if (base64str.endsWith("=")) padding = 1;
  return Math.ceil((len * 3) / 4) - padding;
};
const parseDataUri = (dataUri) => {
  if (typeof dataUri !== "string" || !dataUri.startsWith("data:")) {
    throw new Error("Invalid data URI format");
  }

  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Malformed data URI - missing comma separator");
  }

  const meta = dataUri.slice(5, commaIndex); // Remove 'data:' prefix
  const base64Data = dataUri.slice(commaIndex + 1);
  const declaredMime = meta.split(";")[0] || null;

  return { meta, base64Data, declaredMime };
};
const decodeBase64 = (base64String) => {
  // Remove whitespace
  const cleaned = base64String.replace(/\s+/g, "");

  // Validate base64 characters
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error("Invalid base64 characters detected");
  }

  // Decode to buffer
  const buffer = Buffer.from(cleaned, "base64");

  if (!buffer || buffer.length === 0) {
    throw new Error("Decoded buffer is empty");
  }

  return buffer;
};
const uploadToCloudinary = async (buffer, options = {}) => {
  try {
    // Convert buffer to base64
    const base64Image = buffer.toString("base64");

    // Detect mime type
    const fileType = await fileTypeFromBuffer(buffer);
    const mimeType = fileType?.mime || "image/jpeg";

    // Create data URI for Cloudinary
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
      folder: options.folder || "profiles",
      transformation: options.transformation || [
        { width: 500, height: 500, crop: "fill", gravity: "auto:faces" },
        { quality: "auto:best" },
      ],
      ...options,
    });

    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary.");
  }
};
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });
    
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    // Don't throw - deletion failure shouldn't block upload
    return null;
  }
};

export {
  generate_and_send_jwt,
  estimateBase64Size,
  parseDataUri,
  decodeBase64,
  uploadToCloudinary,
  deleteFromCloudinary
};
