# Netlify deployment

The project is configured for a TanStack Start server deployment on Netlify.

## CLI publish

From the project root:

```powershell
netlify login
netlify link
netlify deploy --build --prod
```

The build configuration is in [`netlify.toml`](../netlify.toml). It sets the Nitro Netlify preset, publishes the generated `dist` directory, and registers the generated server function from `.netlify/functions-internal`.

## Git-connected publish

Create or select a Netlify site and connect this repository. Netlify will use:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `NITRO_PRESET=netlify`

The current app is a browser-backed demo. Orders, stock updates, driver assignments and portal sessions are stored in each visitor&apos;s browser until a production database and authentication layer are connected.
