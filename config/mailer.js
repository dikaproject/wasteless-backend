// config/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false, // Change to false for port 587
  auth: {
    user: process.env.MAIL_USERNAME, // Changed from MAIL_USER
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    // Add TLS options
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// Add verification
transporter.verify(function (error, success) {
  if (error) {
    console.log("Mailer Error:", error);
  } else {
    console.log("Mail server is ready");
  }
});

module.exports = transporter;