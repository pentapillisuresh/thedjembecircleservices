const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

exports.generateTicket = async (order) => {
  const folder = path.join(__dirname, "../uploads/tickets");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const fileName = `TICKET_${order.id}.pdf`;
  const filePath = path.join(folder, fileName);

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<style>

body{
    margin:0;
    background:#f3f3f3;
    font-family:Arial,Helvetica,sans-serif;
}

.ticket{

    width:760px;
    margin:30px auto;
    background:#fff;
    border-radius:10px;
    overflow:hidden;
    border:2px solid #FD9A00;

}

.header{

    background:#FD9A00;
    color:#fff;
    text-align:center;
    padding:20px;

}

.header h1{

    margin:0;
    font-size:30px;

}

.header p{

    margin:8px 0 0;

}

.content{

    padding:30px;

}

.row{

    display:flex;
    justify-content:space-between;
    padding:12px 0;
    border-bottom:1px solid #ddd;

}

.label{

    font-weight:bold;

}

.footer{

    background:#111;
    color:#fff;
    text-align:center;
    padding:18px;
    font-size:14px;

}

</style>

</head>

<body>

<div class="ticket">

<div class="header">

<h1>The Djembe Circle</h1>

<p>Booking Confirmation</p>

</div>

<div class="content">

<div class="row">
<div class="label">Booking ID</div>
<div>#${order.id}</div>
</div>

<div class="row">
<div class="label">Name</div>
<div>${order.User.name}</div>
</div>

<div class="row">
<div class="label">Phone</div>
<div>${order.User.phone}</div>
</div>

<div class="row">
<div class="label">Event</div>
<div>${order.event.title}</div>
</div>

<div class="row">
<div class="label">Venue</div>
<div>${order.event.venue}</div>
</div>

<div class="row">
<div class="label">Date & Time</div>
<div>${new Date(order.event.date).toLocaleString("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
})}</div>
</div>

<div class="row">
<div class="label">Amount Paid</div>
<div>₹${order.totalAmount}</div>
</div>

<div class="row">
<div class="label">Payment ID</div>
<div>${order.razorpayPaymentId || "-"}</div>
</div>

</div>

<div class="footer">

Please carry this ticket while attending the event.

</div>

</div>

</body>
</html>
`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return `https://thedjembecircle.com/uploads/tickets/${fileName}`;
};