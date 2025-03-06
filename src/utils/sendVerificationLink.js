const sendEmail = require("./sendEmail");
const generateJWT = require("./generateJWT");

const sendVerificationLink = async (email,id) => {
  const verificationToken = await generateJWT({ id }, "1h");

  const verificationLink = `${process.env.CLIENT_URL}/verify-account?token=${verificationToken}`;

  await sendEmail(
    email,
    "Verify Your Email",
    `Click the link to verify your email: ${verificationLink}`,
    `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`
  );

};
module.exports = sendVerificationLink;
