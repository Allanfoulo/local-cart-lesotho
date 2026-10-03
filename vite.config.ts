import tailwindcss from "@tailwindcss/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.output/**",
        "**/.netlify/**",
        "**/.worktrees/**",
        "**/.wrangler/**",
        "**/.tanstack/**",
        "**/dist/**",
        "**/artifacts/**",
        "**/test-results/**",
      ],
    },
  },
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    netlify(),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
