import { google } from "googleapis";
import ENV from "./env.js";

const oauth2Client = new google.auth.OAuth2(
  ENV.GOOGLE_OAUTH_CLIENT_ID,
  ENV.GOOGLE_OAUTH_CLIENT_SECRET,
  ENV.NODE_ENV === "development"
    ? "http://localhost:4000"
    : ENV.GOOGLE_OAUTH_REDIRECT_URI
);

const getGoogleUser = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();
    return userInfo.data;
  } catch (error) {
    console.log("Error getting Google user:", error);
    throw error;
  }
};

export { getGoogleUser };
