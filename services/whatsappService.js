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
    console.log("Base64 Preview:", ticket.pdfBase64.substring(0,100));
    console.log("=====================================");

   const response = await axios.get(
    "http://wa.iconicsolution.co.in/wapp/api/v2/send/bytemplate",
    {
        params: {
            apikey: process.env.WHATSAPP_API_KEY,
            templatename: "ticket_booking",
            mobile: phone,
            dvariables: customerName,
            pdf: ticket.pdfUrl
        }
    }
);

    console.log("WhatsApp Sent Successfully");
    console.log(response.data);

    return response.data;

  } catch (error) {

    console.error("WhatsApp Error:");
    console.error(error.response?.data || error.message);

    throw error;
  }

};