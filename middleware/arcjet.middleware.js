import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";
import ENV from "../lib/env.js";

const arcjet_protection = async (req, res, next) => {
  try {
    const decision = await aj.protect(req);
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        res
          .status(429)
          .json({ message: "Too many requests. Try again later." });
      } else if (decision.reason.isBot()) {
        // TODO: This is for testing with postman. Remember to remove.
        ENV.NODE_ENV === "development"
          ? next()
          : res.status(403).json({ message: "Bots are not allowed." });
        // res.status(403).json({ message: "Bots are not allowed." });
      } else {
        res.status(403).json({ message: "Access denied by security policy." });
      }
    }

    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({
        error: "Spoofed bot detected.",
        message: "Malicious bot activity detected.",
      });
    }
    next();
  } catch (error) {
    console.log("Arcjet protection error: \n", error);
    next();
  }
};

export default arcjet_protection;
