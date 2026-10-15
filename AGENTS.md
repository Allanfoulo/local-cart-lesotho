> [!IMPORTANT]
> Avoid rewriting published Git history. Keep pushed commits in a working state.

Use pnpm as declared in `package.json` and commit `pnpm-lock.yaml`. Netlify builds TanStack Start through its Vite adapter and publishes `dist/client`; keep `netlify.toml` aligned with that output.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
