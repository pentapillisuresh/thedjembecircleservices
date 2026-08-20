const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

exports.generateTicket = async (order) => {
  console.log("==================================");
  console.log("GENERATING TICKET");
  console.log("Order ID:", order.id);
  console.log("==================================");

  // =====================================================
  // UPLOAD DIRECTORY
  // =====================================================

  const folder = path.join(
    process.cwd(),
    "uploads",
    "tickets"
  );

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, {
      recursive: true,
    });
  }

  // =====================================================
  // FILE
  // =====================================================

  const fileName = `TICKET_${order.id}.pdf`;

  const filePath = path.join(
    folder,
    fileName
  );

  // =====================================================
  // CUSTOMER
  // =====================================================

  const customerName =
    order.User?.name ||
    "Guest";

  const customerPhone =
    order.User?.phone ||
    "N/A";

  // =====================================================
  // EVENT
  // =====================================================

  const eventTitle =
    order.event?.title ||
    "Event";

  const eventVenue =
    order.event?.venue ||
    "Venue not specified";

  let eventDate = "TBD";
  let eventTime = "";

  if (order.event?.date) {
    const eventDateObject =
      new Date(order.event.date);

    eventDate = eventDateObject.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    eventTime = eventDateObject.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }

  // =====================================================
  // PAYMENT
  // =====================================================

  const paymentId =
    order.razorpayPaymentId ||
    "N/A";

  const paymentStatus =
    order.status ||
    "pending";

  const totalAmount =
    Number(
      order.totalAmount || 0
    ).toFixed(2);

  // =====================================================
  // LOGO PATH - CHANGE THIS PATH TO YOUR LOGO
  // =====================================================

  const logoPath = path.join(
    process.cwd(),
    "uploads",
    "logo.jpeg"
  );

  // =====================================================
  // CREATE PDF
  // =====================================================

  return new Promise(
    (resolve, reject) => {

      const doc =
        new PDFDocument({
          size: "A4",
          margin: 50,
        });

      const writeStream =
        fs.createWriteStream(
          filePath
        );

      const chunks = [];

      // =================================================
      // COLLECT PDF DATA
      // =================================================

      doc.on(
        "data",
        (chunk) => {
          chunks.push(chunk);
        }
      );

      doc.on(
        "error",
        (error) => {
          console.error(
            "PDF Document Error:",
            error
          );

          reject(error);
        }
      );

      writeStream.on(
        "error",
        (error) => {
          console.error(
            "PDF Write Error:",
            error
          );

          reject(error);
        }
      );

      // =================================================
      // FILE COMPLETELY WRITTEN
      // =================================================

      writeStream.on(
        "finish",
        () => {

          try {

            const pdfBuffer =
              Buffer.concat(
                chunks
              );

            // Check PDF
            const pdfHeader =
              pdfBuffer
                .subarray(0, 5)
                .toString();

            if (
              pdfHeader !== "%PDF-"
            ) {
              throw new Error(
                "Generated PDF is invalid"
              );
            }

            // Base64
            const pdfBase64 =
              pdfBuffer.toString(
                "base64"
              );

            // Live URL
            const pdfUrl =
              `https://service.thedjembecircle.com/uploads/tickets/${fileName}`;

            // =================================================
            // LOGS
            // =================================================

            console.log(
              "=================================="
            );

            console.log(
              "PDF GENERATED SUCCESSFULLY"
            );

            console.log(
              "File Name:",
              fileName
            );

            console.log(
              "File Path:",
              filePath
            );

            console.log(
              "PDF Size:",
              pdfBuffer.length
            );

            console.log(
              "PDF Header:",
              pdfHeader
            );

            console.log(
              "PDF URL:",
              pdfUrl
            );

            console.log(
              "Base64 Length:",
              pdfBase64.length
            );

            console.log(
              "Base64 Preview:",
              pdfBase64.substring(
                0,
                50
              )
            );

            console.log(
              "=================================="
            );

            resolve({
              fileName,
              pdfUrl,
              pdfBase64,
            });

          } catch (error) {

            console.error(
              "PDF processing error:",
              error
            );

            reject(error);
          }
        }
      );

      // =================================================
      // PIPE PDF
      // =================================================

      doc.pipe(
        writeStream
      );

      // =================================================
      // BLACK BACKGROUND
      // =================================================

      doc
        .rect(
          0,
          0,
          doc.page.width,
          doc.page.height
        )
        .fillColor(
          "#000000"
        )
        .fill();

      // =================================================
      // MAIN TICKET BORDER - RED AND BLACK THEME
      // =================================================

      // Outer border with red
      doc
        .rect(
          30,
          30,
          535,
          780
        )
        .lineWidth(2)
        .strokeColor(
          "#e01111"
        )
        .stroke();

      // Inner border with dark gray
      doc
        .rect(
          35,
          35,
          525,
          770
        )
        .lineWidth(0.5)
        .strokeColor(
          "#333333"
        )
        .stroke();

      // =================================================
      // TOP RED STRIP - HEADER
      // =================================================

      doc
        .rect(
          35,
          35,
          525,
          80
        )
        .fillColor(
          "#e01111"
        )
        .fill();

      // =================================================
      // ADD LOGO (IF EXISTS)
      // =================================================

      let logoY = 45;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(
            logoPath,
            50,
            42,
            {
              width: 60,
              height: 60,
            }
          );
          logoY = 55;
        } catch (error) {
          console.log("Logo not found, continuing without logo");
        }
      }

      // Company name in white
      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(20)
        .fillColor(
          "#ffffff"
        )
        .text(
          "THE DJEMBE CIRCLE",
          50,
          48,
          {
            width: 495,
            align: "center",
          }
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(12)
        .fillColor(
          "#ffffff"
        )
        .text(
          "CONFIRMATION TICKET",
          50,
          72,
          {
            width: 495,
            align: "center",
          }
        );

      // =================================================
      // DECORATIVE DOTTED LINE
      // =================================================

      for (let i = 35; i < 560; i += 5) {
        doc
          .rect(i, 115, 2, 5)
          .fillColor("#e01111")
          .fill();
      }

      // =================================================
      // EVENT TITLE - PROMINENT DISPLAY
      // =================================================

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(20)
        .fillColor(
          "#ffffff"
        )
        .text(
          eventTitle.toUpperCase(),
          50,
          135,
          {
            width: 495,
            align: "center",
          }
        );

      // =================================================
      // EVENT DATE & VENUE - HIGHLIGHTED
      // =================================================

      let y = 175;

      // Event Date Box
      doc
        .rect(
          50,
          y,
          240,
          55
        )
        .lineWidth(1)
        .strokeColor("#e01111")
        .stroke();

      doc
        .font(
          "Helvetica"
        )
        .fontSize(8)
        .fillColor(
          "#888888"
        )
        .text(
          "DATE",
          60,
          y + 5
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(14)
        .fillColor(
          "#ffffff"
        )
        .text(
          eventDate,
          60,
          y + 20
        );

      // Event Venue Box
      doc
        .rect(
          305,
          y,
          240,
          55
        )
        .lineWidth(1)
        .strokeColor("#e01111")
        .stroke();

      doc
        .font(
          "Helvetica"
        )
        .fontSize(8)
        .fillColor(
          "#888888"
        )
        .text(
          "VENUE",
          315,
          y + 5
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(12)
        .fillColor(
          "#ffffff"
        )
        .text(
          eventVenue,
          315,
          y + 20,
          {
            width: 220,
          }
        );

      y += 75;

      // =================================================
      // EVENT TIME
      // =================================================

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(10)
        .fillColor(
          "#888888"
        )
        .text(
          "Time:",
          50,
          y
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(11)
        .fillColor(
          "#ffffff"
        )
        .text(
          eventTime,
          120,
          y
        );

      y += 35;

      // =================================================
      // TICKET DETAILS HEADER
      // =================================================

      doc
        .rect(
          50,
          y,
          495,
          30
        )
        .fillColor(
          "#e01111"
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(11)
        .fillColor(
          "#ffffff"
        )
        .text(
          "TICKET DETAILS",
          50,
          y + 8,
          {
            width: 495,
            align: "center",
          }
        );

      y += 30;

      // =================================================
      // TABLE HEADER - IMPROVED ALIGNMENT
      // =================================================

      doc
        .rect(
          50,
          y,
          495,
          25
        )
        .fillColor(
          "#1a1a1a"
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(
          "#e01111"
        )
        .text(
          "TICKET TYPE",
          60,
          y + 7,
          {
            width: 150,
          }
        );

      doc.text(
        "QTY",
        270,
        y + 7,
        {
          width: 50,
          align: "center",
        }
      );

      doc.text(
        "PRICE",
        330,
        y + 7,
        {
          width: 80,
          align: "center",
        }
      );

      doc.text(
        "DISCOUNT",
        420,
        y + 7,
        {
          width: 70,
          align: "center",
        }
      );

      doc.text(
        "SUBTOTAL",
        490,
        y + 7,
        {
          width: 80,
          align: "right",
        }
      );

      y += 25;

      // =================================================
      // ORDER ITEMS - IMPROVED ALIGNMENT
      // =================================================

      const items =
        order.items || [];

      if (
        items.length === 0
      ) {

        doc
          .font(
            "Helvetica"
          )
          .fontSize(11)
          .fillColor(
            "#888888"
          )
          .text(
            "No ticket items found.",
            60,
            y + 10
          );

        y += 30;

      } else {

        items.forEach(
          (item, index) => {

            const ticketName =
              item.ticketClass
                ?.name ||
              "Ticket";

            const quantity =
              item.quantity ||
              0;

            const price =
              Number(
                item.priceAtTime ||
                0
              ).toFixed(2);

            const discount =
              Number(
                item.discountPercentageAtTime ||
                0
              ).toFixed(2);

            const subtotal =
              Number(
                item.subtotal ||
                0
              ).toFixed(2);

            // Alternate row colors
            if (index % 2 === 0) {
              doc
                .rect(
                  50,
                  y,
                  495,
                  30
                )
                .fillColor(
                  "#0d0d0d"
                )
                .fill();
            } else {
              doc
                .rect(
                  50,
                  y,
                  495,
                  30
                )
                .fillColor(
                  "#1a1a1a"
                )
                .fill();
            }

            doc
              .font(
                "Helvetica"
              )
              .fontSize(9)
              .fillColor(
                "#ffffff"
              )
              .text(
                ticketName,
                60,
                y + 10,
                {
                  width: 180,
                }
              );

            doc.text(
              String(
                quantity
              ),
              270,
              y + 10,
              {
                width: 50,
                align: "center",
              }
            );

            doc.text(
              `${price}`,
              330,
              y + 10,
              {
                width: 80,
                align: "center",
              }
            );

            if (
              Number(discount) > 0
            ) {
              doc.text(
                `${discount}%`,
                420,
                y + 10,
                {
                  width: 70,
                  align: "center",
                }
              );
            } else {
              doc.text(
                "-",
                420,
                y + 10,
                {
                  width: 70,
                  align: "center",
                }
              );
            }

            doc.text(
              `${subtotal}`,
              490,
              y + 10,
              {
                width: 80,
                align: "right",
              }
            );

            y += 30;
          }
        );
      }

      // =================================================
      // TOTAL AMOUNT - CLEAR AND PROMINENT
      // =================================================

      y += 10;

      // Line above total
      doc
        .moveTo(
          340,
          y
        )
        .lineTo(
          540,
          y
        )
        .strokeColor(
          "#e01111"
        )
        .lineWidth(2)
        .stroke();

      y += 20;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(16)
        .fillColor(
          "#ffffff"
        )
        .text(
          "TOTAL AMOUNT:",
          340,
          y
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(20)
        .fillColor(
          "#e01111"
        )
        .text(
          `Rs ${totalAmount}`,
          490,
          y,
          {
            align: "right",
          }
        );

      y += 50;

      // =================================================
      // BOOKING INFORMATION
      // =================================================

      doc
        .rect(
          50,
          y,
          495,
          25
        )
        .fillColor(
          "#e01111"
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(10)
        .fillColor(
          "#ffffff"
        )
        .text(
          "BOOKING INFORMATION",
          50,
          y + 7,
          {
            width: 495,
            align: "center",
          }
        );

      y += 30;

      const addField =
        (
          label,
          value
        ) => {

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(9)
            .fillColor(
              "#888888"
            )
            .text(
              label + ":",
              60,
              y
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(10)
            .fillColor(
              "#ffffff"
            )
            .text(
              String(value),
              200,
              y,
              {
                width: 300,
              }
            );

          y += 22;
        };

      addField(
        "Order ID",
        order.id
      );

      addField(
        "Customer",
        customerName
      );

      addField(
        "Phone",
        customerPhone
      );

      y += 5;

      // =================================================
      // PAYMENT INFORMATION
      // =================================================

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(
          "#888888"
        )
        .text(
          "Payment ID:",
          60,
          y
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(9)
        .fillColor(
          "#ffffff"
        )
        .text(
          paymentId,
          200,
          y,
          {
            width: 300,
          }
        );

      y += 22;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(
          "#888888"
        )
        .text(
          "Status:",
          60,
          y
        );

      const statusColor =
        paymentStatus.toLowerCase() ===
          "confirmed" ||
          paymentStatus.toLowerCase() ===
          "completed" ||
          paymentStatus.toLowerCase() ===
          "paid"
          ? "#27ae60"
          : "#e01111";

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(10)
        .fillColor(
          statusColor
        )
        .text(
          paymentStatus.toUpperCase(),
          200,
          y
        );

      y += 40;

      // =================================================
      // BOTTOM SECTION WITH TICKET NUMBER
      // =================================================

      // Dotted line separator
      for (let i = 50; i < 545; i += 5) {
        doc
          .rect(i, y, 3, 3)
          .fillColor("#333333")
          .fill();
      }

      y += 15;

      doc
        .font(
          "Helvetica"
        )
        .fontSize(8)
        .fillColor(
          "#666666"
        )
        .text(
          "Please carry this ticket while attending the event.",
          50,
          y,
          {
            width: 495,
            align: "center",
          }
        );

      y += 18;

      doc
        .font(
          "Helvetica"
        )
        .fontSize(8)
        .fillColor(
          "#666666"
        )
        .text(
          "Present this ticket at the venue for entry.",
          50,
          y,
          {
            width: 495,
            align: "center",
          }
        );

      y += 18;

      // Ticket number at bottom
      doc
        .font(
          "Helvetica"
        )
        .fontSize(7)
        .fillColor(
          "#555555"
        )
        .text(
          `Ticket #${order.id}`,
          50,
          y,
          {
            width: 495,
            align: "center",
          }
        );

      y += 15;

      // =================================================
      // RED BOTTOM BORDER - UPDATED TO 2026
      // =================================================

      doc
        .rect(
          35,
          770,
          525,
          35
        )
        .fillColor(
          "#e01111"
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(8)
        .fillColor(
          "#ffffff"
        )
        .text(
          "THE DJEMBE CIRCLE © 2026",
          50,
          780,
          {
            width: 495,
            align: "center",
          }
        );

      // =================================================
      // FINISH
      // =================================================

      doc.end();
    }
  );
};