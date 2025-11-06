import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import User from "../models/User.js";
import {
  estimateBase64Size,
  parseDataUri,
  decodeBase64,
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../lib/utils.js";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_DIMENSION = 4096; // max width/height.

const update_profile_pic = async (req, res) => {
  try {
    const { profile_pic } = req.body;
    const user_id = req.user._id;

    // Authentication check
    if (!user_id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    if (!profile_pic) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    // Parse data URI
    let parsedData;
    try {
      parsedData = parseDataUri(profile_pic);
    } catch (error) {
      return res.status(400).json({ message: error.message });
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
      return res.status(400).json({ message: error.message });
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
        message: "Unsupported file type. Only PNG and JPEG images are allowed",
      });
    }

    // Validate image with sharp and get metadata
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch (error) {
      console.error("Sharp metadata error:", error);
      return res.status(400).json({
        message: "Invalid or corrupted image file",
      });
    }
    if (!metadata?.width || !metadata?.height) {
      return res.status(400).json({
        message: "Could not determine image dimensions",
      });
    }
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      return res.status(413).json({
        message: `Image dimensions too large. Maximum is ${MAX_DIMENSION}x${MAX_DIMENSION}px`,
      });
    }

    // Upload to Cloudinary
    let uploadResult;
    try {
      const deleteResult = await deleteFromCloudinary(
        req.user.profile_pic_public_id
      );
      uploadResult = await uploadToCloudinary(buffer, {
        folder: "profiles",
        public_id: `user_${user_id}_${Date.now()}`, // Unique identifier
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(502).json({
        message: "Failed to upload image. Please try again",
      });
    }

    // Update user profile in database
    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      {
        profile_pic: uploadResult.secure_url,
        profile_pic_public_id: uploadResult.public_id, // Store for potential deletion
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile picture updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile picture update error:", error);
    return res.status(500).json({
      message: "Internal server error. Please try again later",
    });
  }
};

const delete_profile_pic = async (req, res) => {
  try {
    const user = req.user;

    if (!user.profile_pic_public_id && !user.profile_pic) {
      return res.status(400).json({ message: "No profile picture to delete" });
    }

    if (user.profile_pic_public_id) {
      const deleteResult = await deleteFromCloudinary(
        user.profile_pic_public_id
      );

      // Log result but don't fail if Cloudinary deletion fails
      if (deleteResult?.result === "ok") {
        console.log(
          "Image deleted from Cloudinary:",
          user.profile_pic_public_id
        );
      } else {
        console.warn("Cloudinary deletion returned:", deleteResult);
        // Continue anyway - we'll clear DB reference
      }
    }

    const delete_pic = {
      profile_pic: "",
      profile_pic_public_id: "",
    };

    const updatedUser = await User.findByIdAndUpdate(user_id, delete_pic, {
      new: true,
    }).select("-password");

    return res.status(200).json({
      message: "Profile picture deleted successfully.",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
};

const update_profile_info = async (req, res) => {
  try {
    const user = req.user;
    const { full_name, username, bio } = req.body;
    const processed_full_name =
      typeof full_name === "string" ? full_name.trim() : "";
    const processed_username =
      typeof username === "string" ? username.trim() : "";
    const processed_bio = typeof bio === "string" ? bio.trim() : "";
    if (!processed_full_name) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (processed_full_name.length < 3 || processed_full_name.length > 30) {
      return res
        .status(400)
        .json({ message: "Name must be 3 - 30 characters." });
    }
    const full_name_regex =
      /^[\p{L}\p{N}' \-\p{Emoji}\p{Emoji_Component}]+$/u;
    if (!full_name_regex.test(processed_full_name)) {
      return res.status(400).json({ message: "Invalid name format." });
    }

    if (processed_username) {
      if (processed_username.length < 3 || processed_username.length > 16) {
        return res
          .status(400)
          .json({ message: "Username must be 3 - 16 characters." });
      }
      const username_regex = /^[a-zA-Z0-9._-]+$/;
      if (!username_regex.test(processed_username)) {
        return res.status(400).json({ message: "Invalid username format." });
      }
    }

    if (processed_bio) {
      if (processed_bio.length > 200) {
        return res.status(400).json({ message: "Your bio is too long." });
      }
    }

    const existing_user = await User.findOne({
      username: processed_username,
      _id: { $ne: user._id },
    });
    if (existing_user) {
      return res.status(400).json({
        message: "Unable to process your update. Username exists.",
      });
    }

    const {
      full_name: existing_full_name,
      username: existing_username,
      bio: existing_bio,
    } = user;
    if (
      existing_full_name === processed_full_name &&
      existing_username === processed_username &&
      existing_bio === processed_bio
    ) {
      return res
        .status(400)
        .json({ message: "The data matches. No need for an update." });
    }

    const user_update = {
      full_name: processed_full_name,
      username: processed_username,
      bio: processed_bio,
    };

    const updatedUser = await User.findByIdAndUpdate(user._id, user_update, {
      new: true,
    }).select("-password");

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
};

export { update_profile_pic, delete_profile_pic, update_profile_info };
