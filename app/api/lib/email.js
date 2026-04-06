import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "mail.commerceet.com",

  port: 587,
secure: false,

  //port: 465,
  //secure: true, // VERY IMPORTANT for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"ET-Commerce" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};