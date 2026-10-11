import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const password = Password({
  verify: ResendOTP,
  reset: ResendOTP,
  profile(params) {
    const email = params["email"];
    if (typeof email !== "string" || !email.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    // Authentication may create an identity, but authorization is granted only through
    // the server-validated first-admin bootstrap or an accepted staff invitation.
    return { email: normalizeEmail(email) };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
});
