const nodemailer = require('nodemailer');

// Configure the nodemailer transporter
let transporter = null;
let isEmailEnabled = false;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465', 10),
    secure: true, // Use SSL/TLS for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  isEmailEnabled = true;
} else {
  console.warn('[WARNING] SMTP credentials missing in .env (EMAIL_HOST, EMAIL_USER, EMAIL_PASS). Email features will be disabled and logged to console.');
}

const sendEmail = async (options) => {
  const mailOptions = {
    from: `IntelliConsult <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@intelliconsult.com'}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  if (!isEmailEnabled || !transporter) {
    console.log('--- EMAIL MOCK (SMTP Disabled) ---');
    console.log('To:', mailOptions.to);
    console.log('From:', mailOptions.from);
    console.log('Subject:', mailOptions.subject);
    console.log('HTML:', mailOptions.html);
    console.log('----------------------------------');
    return;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending email via Nodemailer:", error);
    // We intentionally catch the error so it doesn't crash the calling route by default
    return false;
  }
};

module.exports = sendEmail;
