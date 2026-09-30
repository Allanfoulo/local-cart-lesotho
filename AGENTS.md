> [!IMPORTANT]
> Avoid rewriting published Git history. Keep pushed commits in a working state.

Use pnpm as declared in `package.json` and commit `pnpm-lock.yaml`. Netlify builds TanStack Start through its Vite adapter and publishes `dist/client`; keep `netlify.toml` aligned with that output.
