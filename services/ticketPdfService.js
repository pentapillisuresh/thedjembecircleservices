const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");    // npm install pdfkit

exports.generateTicket = async (order) => {
  // Ensure the upload directory exists
  const folder = path.join(__dirname, "../uploads/tickets");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const fileName = `TICKET_${order.id}.pdf`;
  const filePath = path.join(folder, fileName);

  // Create a new PDF document (A4, with margins)
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // Prepare a write stream and a buffer to capture the PDF data
  const writeStream = fs.createWriteStream(filePath);
  const chunks = [];

  return new Promise((resolve, reject) => {
    // Collect PDF data chunks for Base64 encoding later
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      const pdfBase64 = pdfBuffer.toString("base64");
      const pdfUrl = `https://service.thedjembecircle.com/uploads/tickets/${fileName}`;

      console.log("==================================");
      console.log("PDF GENERATED");
      console.log("File Name :", fileName);
      console.log("File Path :", filePath);
      console.log("PDF URL   :", pdfUrl);
      console.log("Base64 Length :", pdfBase64.length);
      console.log("Base64 Preview :", pdfBase64.substring(0, 100));
      console.log("==================================");

      resolve({
        fileName,
        pdfUrl,
        pdfBase64,
      });
    });

    doc.on("error", (err) => {
      reject(err);
    });

    // Pipe the PDF to both the write stream and the data collector
    doc.pipe(writeStream);

    // ------------------------------------------------------------
    // Design the ticket using PDFKit drawing and text methods
    // ------------------------------------------------------------

    // 1. Draw a decorative border
    doc.rect(30, 30, 555, 792)              // A4: 595.28 x 841.89 points (with margins 30)
      .stroke("#2c3e50");

    // 2. Title
    doc.fontSize(28)
      .fillColor("#2980b9")
      .text("TICKET", 50, 70, { align: "center" });

    // 3. Separator line
    doc.moveTo(50, 120)
      .lineTo(565, 120)
      .stroke("#2980b9");

    // 4. Order details
    doc.fontSize(14)
      .fillColor("#333333");

    const details = [
      { label: "Order ID", value: order.id || "N/A" },
      { label: "Event", value: order.event.name || order.event || "Not specified" },
      { label: "Customer", value: order.customerName || order.customer || "Guest" },
      { label: "Date", value: order.eventDate || order.date || "TBD" },
      { label: "Seat", value: order.seatNumber || order.seat || "General Admission" },
    ];

    let yPos = 160;
    details.forEach(({ label, value }) => {
      doc.font("Helvetica-Bold")
        .text(`${label}:`, 50, yPos, { continued: true })
        .font("Helvetica")
        .text(` ${value}`, { align: "left" });
      yPos += 30;
    });

    // 5. Additional note (same as original HTML)
    doc.fontSize(12)
      .fillColor("#7f8c8d")
      .text("Please carry this ticket while attending the event.", 50, yPos + 40, {
        align: "center",
        width: 500,
      });

    // 6. Footer with a subtle barcode-like line (optional)
    doc.moveTo(50, 780)
      .lineTo(565, 780)
      .dash(5, { space: 5 })
      .stroke("#bdc3c7");

    // End the PDF document (this triggers the 'end' event)
    doc.end();
  });
};