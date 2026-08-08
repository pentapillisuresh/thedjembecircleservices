const axios = require("axios");
require("dotenv").config();

exports.sendTicketConfirmation = async (
  phone,
  customerName,
  ticket
) => {
  const enabled = process.env.WHATSAPP_ENABLED === "true";

  if (!enabled) {
    console.log(`[WHATSAPP DISABLED] Would send ticket to ${phone}`);
    return;
  }

  try {
    console.log("========== WhatsApp Request ==========");
    console.log("Phone:", phone);
    console.log("Customer Name:", customerName);
    console.log("PDF URL:", ticket.pdfUrl);
    console.log("File Name:", ticket.fileName);
    console.log("Base64 Length:", ticket.pdfBase64.length);
    console.log("Base64 Preview:", ticket.pdfBase64.substring(0, 100));
    console.log("=====================================");

    // Remove data URL prefix if it exists
    const cleanBase64 = ticket.pdfBase64
      .replace(/^data:application\/pdf;base64,/, "")
      .replace(/^data:.*;base64,/, "");

    const response = await axios.post(
      "https://wa.iconicsolution.co.in/wapp/api/v2/send/bytemplate/json",

      // IMPORTANT: API expects ARRAY
      [
        {
          templatename: "ticket_booking",

          // Use +91
          mobile: phone.startsWith("+")
            ? phone
            : `+91${phone}`,

          dvariables: [
            customerName
          ],

          medianame: ticket.fileName,

          // IMPORTANT: RAW BASE64 only
          media: cleanBase64
        }
      ],

      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.WHATSAPP_API_KEY
        },

        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log("WhatsApp Sent Successfully");
    console.log(response.data);

    return response.data;

  } catch (error) {
    console.error("WhatsApp Error:");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }

    throw error;
  }
};