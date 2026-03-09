import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const RESEND_COOLDOWN_SECONDS = 60;

export const sendRegisterOtp = async (req, res) => {
  try {
    const { mobileNumber, customerType } = req.body;

    if (customerType !== "B2B" && customerType !== "B2C") {
      return res.status(400).json({
        message: "OTP is applicable only for B2B and B2C registration",
      });
    }

    //  ONLY send OTP via Twilio
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: `+91${mobileNumber}`,
        channel: "sms",
      });

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};

export const verifyRegisterOtp = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: `+91${mobileNumber}`,
        code: otp,
      });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    //  DO NOT CREATE CUSTOMER HERE
    return res.status(200).json({
      verified: true,
      message: "Mobile number verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      message: "OTP verification failed",
    });
  }
};
