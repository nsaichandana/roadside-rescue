const { onRequest } = require("firebase-functions/v2/https");
const fetch = require("node-fetch");

const FAST2SMS_KEY = "DgzedXN4sjBy8wAuKc2vxF7rIqJYihRVl9ob516LSUMZ3pmk0TgvZaHbDPCKkcYNMjLiI2mEfwhnVJQd";

exports.sendSOS = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { numbers, message } = req.body;

    if (!numbers || !message) {
      res.status(400).json({ error: "Missing numbers or message" });
      return;
    }

    try {
      const cleaned = numbers
        .map((p) => p.replace(/\D/g, "").replace(/^91/, "").slice(-10))
        .filter((p) => p.length === 10)
        .join(",");

      if (!cleaned) {
        res.status(400).json({ error: "No valid phone numbers" });
        return;
      }

      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: FAST2SMS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message,
          language: "english",
          flash: 0,
          numbers: cleaned,
        }),
      });

      const data = await response.json();

      if (data.return === true) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, error: data.message });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);