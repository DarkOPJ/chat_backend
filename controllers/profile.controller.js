import cloudinary from "../lib/cloudinary";
import User from "../models/User";

const update_profile = async (req, res) => {
  const { profile_pic } = req.body;

  try {
    if (!profile_pic) {
      return res.status(400).json({ message: "Profile picture is required." });
    }

    const user_id = req.user._id;

    const uploaded_image = await cloudinary.uploader.upload(profile_pic);

    const updated_user = await User.findByIdAndUpdate(
      user_id,
      { profile_pic: uploaded_image.secure_url },
      { new: true }
    ).select("-password");

    return res.status(200).json(updated_user);
  } catch (error) {
    console.log("Something went wrong with the user Profile Update: ", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export { update_profile };
