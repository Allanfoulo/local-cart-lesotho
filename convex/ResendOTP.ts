import Resend from "@auth/core/providers/resend";
import { Resend as ResendClient } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { getDeploymentEnv } from "./lib/environment";

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: getDeploymentEnv("RESEND_API_KEY"),
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, "0123456789", 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const apiKey = provider.apiKey;
    const from = getDeploymentEnv("AUTH_EMAIL_FROM");
    if (!apiKey || !from) {
      throw new Error("Email verification is not configured for this deployment.");
    }

    const resend = new ResendClient(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject: "Your REETAPELE security code",
      text: `Your REETAPELE verification code is ${token}. If you did not request it, ignore this email.`,
    });
    if (error) {
      throw new Error("Could not send the verification email.");
    }
  },
});
