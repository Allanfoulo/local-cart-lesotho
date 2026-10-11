# Convex backend foundation design

## 1. Architecture goal

Add Convex as the transactional backend for catalog reads and guest order placement while preserving the current local demo store until a deployment is configured. Keep business rules framework independent and make catalog/order operations the first migration slice.

## 2. Domain concepts

- Category and Product: public catalog records; products own availability, pricing, unit, weight behavior, and stock.
- Customer: checkout contact information keyed by normalized phone number.
- Order: immutable checkout snapshots, delivery destination, payment choice, totals, and current status.
- Order history event: versioned, durable history entry attached to an order.
- Store settings: delivery fee, minimum basket amount, service areas, and payment options.
- Money is stored in LSL rounded to two decimal places. Order prices are snapshotted at checkout.

## 3. Use cases

- List enabled categories and available products.
- Place a guest order. The backend rereads product and store data, checks stock and minimum value, calculates totals, decrements stock, updates customer totals, inserts the order, and records its initial event atomically.
- Repeated checkout request IDs return the existing order identity rather than creating a duplicate.
- Staff catalog edits, payment verification, status changes, account ownership, and private order lookup wait until authentication and authorization are chosen.

## 4. Events

`OrderPlaced.v1` is stored in `orderEvents` in the order transaction. The initial consumer is order history/tracking UI; future notification or fulfillment handlers can consume it. It contains no customer contact or destination details. No external broker is used.

## 5. Jobs

No background jobs are required yet. Payment reconciliation, notifications, and delivery assignment need provider/workflow decisions. Convex scheduling can be added when those needs are concrete.

## 6. Coupling analysis

- Operational: Convex is a new runtime dependency. Keep `pnpm dev` working for the local demo without a deployment URL.
- Developmental: schema changes affect generated Convex types. Generate and commit `_generated` files when CLI access works.
- Semantic: UI cart totals are untrusted; recalculate from current backend records.
- Functional: checkout depends on stock and settings; keep reads and writes in one mutation.
- Incidental: avoid routing all operations through the large AppStore. Add a narrow adapter and migrate screens gradually.

## 7. Responsibility split

- UI collects cart/contact/destination data and displays results; it does not authoritatively calculate totals.
- Application/backend validates commands, reads current records, enforces permissions, and coordinates transactions.
- Domain contains deterministic pricing, quantity, stock, and total rules.
- Agents, workers, and external integrations are not part of this slice.
- Infrastructure contains schema, indexes, validators, provider configuration, and future integrations.

## 8. Message contracts

- `PlaceOrder`: checkout request ID, buyer contact, destination area/address and optional landmark/coordinates, payment method, and product IDs with quantities.
- `OrderPlaced.v1`: order ID, order number, status, total, and occurrence time. PII and destination are excluded.
- Public catalog queries return enabled categories and available products.
- Order placement returns the order ID and number. Private order detail queries are absent until authorization is available.

## 9. Refactor plan

1. Add Convex dependency/configuration and preserve local demo operation without `VITE_CONVEX_URL`.
2. Add schema, seed function, pure order rules, catalog queries, and transactional guest order creation.
3. Provision a dev deployment and generate Convex types when CLI access is available.
4. Migrate catalog reads and checkout screen by screen, keeping the local demo fallback until data is seeded.
5. Choose an auth provider and then add staff/customer authorization, private tracking, and delivery operations.

## 10. Folder structure

```text
convex/{schema,catalog,orders,seed}.ts
src/domain/orders/{pricing,events}.ts
```

Convex functions are outer adapters. Domain modules have no Convex imports.

## 11. Testing strategy

- Unit-check deterministic pricing, quantity validation, and rounding.
- Exercise catalog and order functions against Convex before migrating checkout UI.
- Verify duplicate checkout IDs do not decrement stock twice, insufficient stock rejects the whole transaction, and event creation is atomic.
- Add authorization coverage when private staff/customer functions arrive.

## 12. Final recommendation

Start with catalog reads and guest order placement. Convex transactions keep inventory and orders consistent; a versioned history row records the business event without adding a broker. Keep authentication and private order access out of scope until a provider is selected.
