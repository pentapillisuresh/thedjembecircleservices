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

  const eventType =
    order.event?.eventType ||
    "other";

  let eventDate = "TBD";
  let eventTime = "";

  if (order.event?.date) {
    const eventDateObject =
      new Date(order.event.date);

    eventDate =
      eventDateObject.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );

    eventTime =
      eventDateObject.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
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
      // BORDER
      // =================================================

      doc
        .rect(
          30,
          30,
          535,
          780
        )
        .lineWidth(1)
        .strokeColor(
          "#2c3e50"
        )
        .stroke();

      // =================================================
      // HEADER
      // =================================================

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(26)
        .fillColor(
          "#2980b9"
        )
        .text(
          "THE DJEMBE CIRCLE",
          50,
          65,
          {
            width: 495,
            align: "center",
          }
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(15)
        .fillColor(
          "#333333"
        )
        .text(
          "EVENT TICKET",
          50,
          105,
          {
            width: 495,
            align: "center",
          }
        );

      // =================================================
      // LINE
      // =================================================

      doc
        .moveTo(
          50,
          140
        )
        .lineTo(
          545,
          140
        )
        .strokeColor(
          "#2980b9"
        )
        .stroke();

      // =================================================
      // BOOKING INFORMATION
      // =================================================

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(16)
        .fillColor(
          "#222222"
        )
        .text(
          "Booking Information",
          50,
          170
        );

      let y = 205;

      const addField =
        (
          label,
          value
        ) => {

          doc
            .font(
              "Helvetica-Bold"
            )
            .fontSize(11)
            .fillColor(
              "#555555"
            )
            .text(
              label,
              60,
              y
            );

          doc
            .font(
              "Helvetica"
            )
            .fontSize(12)
            .fillColor(
              "#111111"
            )
            .text(
              String(value),
              190,
              y,
              {
                width: 340,
              }
            );

          y += 28;
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

      addField(
        "Event",
        eventTitle
      );

      addField(
        "Date",
        eventDate
      );

      addField(
        "Time",
        eventTime
      );

      addField(
        "Venue",
        eventVenue
      );

      addField(
        "Event Type",
        eventType
      );

      // =================================================
      // TICKET DETAILS
      // =================================================

      y += 15;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(16)
        .fillColor(
          "#222222"
        )
        .text(
          "Ticket Details",
          50,
          y
        );

      y += 30;

      // =================================================
      // TABLE HEADER
      // =================================================

      doc
        .rect(
          50,
          y,
          495,
          30
        )
        .fillColor(
          "#2980b9"
        )
        .fill();

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(9)
        .fillColor(
          "#ffffff"
        )
        .text(
          "Ticket",
          60,
          y + 9
        );

      doc.text(
        "Qty",
        300,
        y + 9
      );

      doc.text(
        "Price",
        350,
        y + 9
      );

      doc.text(
        "Subtotal",
        440,
        y + 9
      );

      y += 30;

      // =================================================
      // ORDER ITEMS
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
            "#333333"
          )
          .text(
            "No ticket items found.",
            60,
            y + 10
          );

        y += 30;

      } else {

        items.forEach(
          (item) => {

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

            doc
              .rect(
                50,
                y,
                495,
                35
              )
              .fillColor(
                "#f5f5f5"
              )
              .fill();

            doc
              .font(
                "Helvetica"
              )
              .fontSize(9)
              .fillColor(
                "#222222"
              )
              .text(
                ticketName,
                60,
                y + 11,
                {
                  width: 220,
                }
              );

            doc.text(
              String(
                quantity
              ),
              300,
              y + 11
            );

            doc.text(
              `₹${price}`,
              350,
              y + 11
            );

            doc.text(
              `₹${subtotal}`,
              440,
              y + 11
            );

            y += 35;

            // Discount
            if (
              Number(discount) > 0
            ) {

              doc
                .fontSize(8)
                .fillColor(
                  "#777777"
                )
                .text(
                  `Discount: ${discount}%`,
                  60,
                  y
                );

              y += 15;
            }
          }
        );
      }

      // =================================================
      // TOTAL
      // =================================================

      y += 15;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(14)
        .fillColor(
          "#222222"
        )
        .text(
          "Total Amount:",
          300,
          y
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(15)
        .fillColor(
          "#2980b9"
        )
        .text(
          `₹${totalAmount}`,
          440,
          y
        );

      // =================================================
      // PAYMENT INFORMATION
      // =================================================

      y += 45;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(15)
        .fillColor(
          "#222222"
        )
        .text(
          "Payment Information",
          50,
          y
        );

      y += 30;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(10)
        .fillColor(
          "#555555"
        )
        .text(
          "Payment Status",
          60,
          y
        );

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(11)
        .fillColor(
          "#27ae60"
        )
        .text(
          paymentStatus.toUpperCase(),
          190,
          y
        );

      y += 25;

      doc
        .font(
          "Helvetica-Bold"
        )
        .fontSize(10)
        .fillColor(
          "#555555"
        )
        .text(
          "Razorpay Payment ID",
          60,
          y
        );

      doc
        .font(
          "Helvetica"
        )
        .fontSize(10)
        .fillColor(
          "#222222"
        )
        .text(
          paymentId,
          190,
          y,
          {
            width: 340,
          }
        );

      // =================================================
      // IMPORTANT NOTE
      // =================================================

      doc
        .font(
          "Helvetica"
        )
        .fontSize(10)
        .fillColor(
          "#777777"
        )
        .text(
          "Please carry this ticket while attending the event.",
          50,
          690,
          {
            width: 495,
            align: "center",
          }
        );

      doc
        .text(
          "Please present this ticket at the venue for entry.",
          50,
          710,
          {
            width: 495,
            align: "center",
          }
        );

      // =================================================
      // FOOTER
      // =================================================

      doc
        .moveTo(
          50,
          750
        )
        .lineTo(
          545,
          750
        )
        .strokeColor(
          "#cccccc"
        )
        .stroke();

      doc
        .fontSize(9)
        .fillColor(
          "#888888"
        )
        .text(
          "Thank you for booking with The Djembe Circle.",
          50,
          765,
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