# Local Cart Lesotho

## Project goal

Local Cart Lesotho is a mobile-first grocery shopping app for a neighbourhood shop in Maseru. It brings everyday groceries and household essentials online while keeping the experience familiar, affordable, and dependable.

Customers can browse and search products, see Maloti prices and availability, build a cart, choose delivery and payment details, place orders, and review order progress. Shop staff have tools for managing the catalogue, stock, promotions, orders, and fulfilment.

The project is designed for one local shop today. Its data and UI should remain clear enough to support additional shops or real service integrations later.

## Architecture

- **TanStack Start, TanStack Router, React, and TypeScript** power the application. Routes live in `src/routes`; file-based routing keeps the customer, admin, operations, and driver journeys easy to locate and extend.
- **Shared React components** live in `src/components`. Common product, navigation, and form UI can be reused across pages while route components focus on each screen.
- **Domain types, seed data, pricing, and application state** live in `src/lib`. Keeping these concerns out of page markup makes everyday commerce rules easier to follow and change.
- **Tailwind CSS and accessible UI primitives** provide a consistent responsive interface without building every interaction from scratch.
- **Seeded demo data and browser storage** make the shopping and fulfilment flows usable without a live backend. A future API and database can replace the demo persistence as the project moves toward production.
- **Vite** runs the development server and production build.

This architecture fits the project because file-based routes map naturally to its many shopping and fulfilment screens, TypeScript helps keep product and order data consistent, and reusable components support a coherent mobile experience. The current demo remains straightforward to develop while leaving room to connect real inventory, payments, and delivery services.

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

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Useful commands:

```sh
npm run build
npm run typecheck
npm run lint
npm test
```
