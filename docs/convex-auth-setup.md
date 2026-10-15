# Convex Auth and deployment configuration

Convex Auth handles email/password signup, email verification, and password reset through Resend. Memberships in Convex decide which workspace an authenticated user can access.

## Development deployment

The connected development deployment is configured for the local app at `http://localhost:7093` and the initial admin address `allanfdeveloper@gmail.com`. Keep these environment variables in the **Convex development deployment**, not in the frontend `.env` file:

- `RESEND_API_KEY`: Resend API key with sending permission.
- `AUTH_EMAIL_FROM`: verified sender, currently `REETAPELE <auth@allanfdeveloper.space>`.
- `INITIAL_SUPERADMIN_EMAIL`: `allanfdeveloper@gmail.com` for the initial setup flow.
- `SITE_URL`: `http://localhost:7093`; used to build staff invitation links.

Never commit or paste the Resend key into source files or chat.

### Convex CLI troubleshooting

The CLI uses the `CONVEX_DEPLOYMENT` value in `.env.local` to select the project and development deployment. CLI credentials are stored separately for the Windows user running the command. If a command appears to hang and its error mentions a proxy at `127.0.0.1:9`, clear `HTTPS_PROXY`, `HTTP_PROXY`, and `ALL_PROXY` in that PowerShell session, then retry. Do not run `convex dev --verbose` when environment variables contain secrets; verbose deployment diagnostics can print their values.

## Production deployment

The production Netlify site and Convex production deployment have separate configuration. Before a production launch:

1. In Convex, select the **production deployment** and set `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `INITIAL_SUPERADMIN_EMAIL`, and `SITE_URL`. Use the production site URL for `SITE_URL` (the intended site is `https://allanfdeveloper.space`). Keep the production Resend key and verified sender configured on this Convex deployment.
2. In Netlify, set `VITE_CONVEX_URL` to the production deployment’s `https://…convex.cloud` URL, with **Builds** scope in the Production context. It is a frontend build value, so setting it only in your local environment does not configure Netlify.
3. Keep the Netlify build command `pnpm build` and publish directory `dist/client`; `netlify.toml` already contains these values.
4. Verify signup, OTP delivery, password reset, invitation links, and sign-in from the production domain.
5. Create the first production super admin through `/admin/sign-in`. Convex development and production deployments have separate data, so the development superadmin membership is not automatically copied to production.

Set secrets in the Convex and Netlify dashboards (or their CLIs), not in `netlify.toml`, `.env.example`, or committed source. Convex functions read backend variables from the selected Convex deployment; the browser receives only `VITE_CONVEX_URL`. [Convex environment variable guide](https://docs.convex.dev/production/environment-variables) · [Netlify environment variable guide](https://docs.netlify.com/build/environment-variables/get-started/) · [Convex hosting guide](https://docs.convex.dev/production/hosting/custom).

## First super admin

1. Start the app at `http://localhost:7093` and open `/admin/sign-in`.
2. Choose **Set up the first admin account**, enter the configured initial email, and choose a password of at least 8 characters.
3. Enter the one-time code delivered by email. A server mutation grants the platform-wide `superadmin` membership only if the account has a verified matching email and no superadmin membership exists.

Only the configured initial address can claim the first superadmin membership. Subsequent staff accounts need an invitation and can only receive the invited store-scoped role. Customer accounts can sign themselves up and remain customers until granted an authorized membership.

## Build and hosting

Use pnpm from `package.json` and commit `pnpm-lock.yaml`. `netlify.toml` configures the TanStack Start/Vite build to publish `dist/client`. Set `VITE_CONVEX_URL` for each Netlify deploy context that should connect to a Convex deployment (Production, Deploy Previews, and local development may each use different deployments).
