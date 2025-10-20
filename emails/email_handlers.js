import { resendClient, sender } from "../lib/resend.js";
import { create_welcome_email_template } from "./email_template.js";

const send_welcome_email = async (email, name, clientURL) => {
  const { data, error } = await resendClient.emails.send({
    from: `${sender.name}<${sender.email}>`,
    to: email,
    subject: "Welcome to Chatty!",
    html: create_welcome_email_template(name, clientURL),
  });

  if (error) {
    console.error("Error sending welcome email: ", error);
    throw new Error("Failed to send welcome email");
  }

  console.log("Welcome Email sent successfully. \n", data);
};

export { send_welcome_email };
