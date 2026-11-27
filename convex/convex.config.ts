import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    GOOGLE_MAPS_ROUTES_API_KEY: v.optional(v.string()),
    MOPAY_API_KEY: v.optional(v.string()),
    MOPAY_WEBHOOK_TOKEN: v.optional(v.string()),
    MOPAY_REDIRECT_BASE_URL: v.optional(v.string()),
  },
});
