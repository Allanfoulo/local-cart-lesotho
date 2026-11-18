# REETAPELE

## Project goal

REETAPELE is a mobile-first neighbourhood marketplace for weekly groceries and household essentials in Lesotho. The first pilot is operated through our own grocery store; the architecture supports additional independent stores after the first-party operation is validated.

Customers can browse and search products, see Maloti prices and availability, build a cart, choose delivery and payment details, place orders, and review order progress. Shop staff have tools for managing the catalogue, stock, promotions, orders, and fulfilment.

The pilot will serve Ha-Matala Phase I and/or Phase II once the operating area and delivery policy are confirmed. English and Sesotho are required customer languages. Operational dependability takes priority over marketplace expansion.

## Architecture

- **TanStack Start, TanStack Router, React, and TypeScript** power the application. Routes live in `src/routes`; file-based routing keeps the customer, admin, operations, and driver journeys easy to locate and extend.
- **Shared React components** live in `src/components`. Common product, navigation, and form UI can be reused across pages while route components focus on each screen.
- **Domain types, seed data, pricing, and application state** live in `src/lib` and `src/domain`. Convex is authoritative for authenticated catalog, inventory, checkout, order, membership, and delivery workflows; browser state supports the active customer cart and presentation.
- **Tailwind CSS and accessible UI primitives** provide a consistent responsive interface without building every interaction from scratch.
- **Convex** stores current marketplace and operational records. Seed data is for development and must not be treated as the verified pilot catalogue or real inventory.
- **Vite** runs the development server and production build.

This architecture fits the project because file-based routes map naturally to shopping and fulfillment workflows, TypeScript helps keep product and order data consistent, and reusable components support a coherent mobile experience. Cash on delivery and manually verified mobile money are the current payment workflows; card processing and provider-backed payment verification are not configured.

## Project structure

```text
src/
  components/   Shared UI and workflow components
  lib/          Types, seed data, commerce rules, and app state
  routes/       File-based application routes
  assets/       Images and other bundled assets
public/         Static files served directly
```

## Run locally

Requires Node.js and pnpm. The project pins its package manager version in `package.json`.

```sh
pnpm install
pnpm dev
```

Useful commands:

```sh
pnpm build
pnpm lint
```

The app uses a Convex development deployment for authenticated marketplace data. Configure the local Vite Convex URL and the Convex Auth/email variables for the selected non-production deployment before testing sign-in or staff workflows. Keep production credentials separate and never use production data for automated checkout tests.

Netlify builds with pnpm build and publishes dist/client through the TanStack Start Vite adapter. See [the operations runbook](docs/operations-runbook.md) for environment boundaries, preview testing and recovery procedures. See the [marketplace phased plan](docs/marketplace-phased-plan.md) and the REETAPELE completion documents for pilot requirements and readiness gates.
