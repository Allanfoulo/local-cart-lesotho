# User Roles and Dashboards

## Purpose

Mabote Fresh serves five distinct user groups. Each group should have a view that fits its work, while shared store data keeps customers, orders, stock, and delivery status consistent.

This document separates what the current role-based demo previews from access controls planned for a fuller system.

## User Groups

| User group                 | Main needs                                                                                               | Intended dashboard              | Viewport priority                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------- |
| Customer                   | Browse groceries, checkout, manage addresses, and follow order status                                    | Customer storefront and account | Phone first, also works on desktop            |
| Manager / owner            | Monitor the shop, manage staff access, review operations, and change store settings                      | Management overview             | Desktop and tablet first, usable on phone     |
| Order and dispatch staff   | Confirm and prepare orders, assign drivers, arrange delivery stops, and record payment checks            | Orders and dispatch             | Phone first, also works on tablet and desktop |
| Stock and promotions staff | Maintain products, stock counts, categories, and offers                                                  | Catalogue workspace             | Tablet and desktop first, usable on phone     |
| Driver                     | See assigned deliveries, contact and location details needed for each stop, and update delivery progress | Driver dashboard                | Phone first, with large touch targets         |

## Current Demo Coverage

The current demo has customer routes for the shop, cart, checkout, account, and order history. `/demo-login` is a role selector for previewing the Manager (`/admin`), Orders and dispatch (`/staff/dispatch`), Stock and promotions (`/staff/catalogue`), Driver (`/driver`), and Customer (`/account`) views. These are navigation destinations, not separate authenticated logins. The `/admin` workspace contains an overview, order queue, customer lookup with recent order history, dispatch, products and stock, promotions and categories, delivery places, local order and payment reports, and shop settings. The phone-first dispatch workspace supports order status and payment checks, driver assignment, and a locally saved manual stop order. Customer records and report totals come from data saved in the current browser; report totals are not a shared or audited financial record.

The role-specific views are a presentation convenience only. There is no staff login or role permission system; anyone can open the staff URLs and `/admin` still exposes all staff sections in that browser. Customer account data is also a local demo profile, not an authenticated account.

## Role Views

### Customer

- Browse categories and products, manage cart, and complete the three-step checkout.
- Manage profile, saved addresses, favourites, preferences, and order history.
- See saved order status and timeline; do not imply live driver tracking.
- Keep checkout and common account tasks comfortable on a phone.

### Manager / Owner

- Start with orders needing attention, current fulfilment work, stock alerts, and recent sales.
- Review shop settings and oversee all staff work areas.
- In a real deployment, manage staff accounts and role access from a protected manager area.
- Provide a broad desktop overview with a useful, simplified phone layout.

### Order and Dispatch Staff

- Work the order queue, customer contact and delivery notes needed for fulfilment, status history, and payment verification.
- Assign drivers and set a manual stop sequence from the phone-first dispatch view.
- Keep the map approximate; do not transmit customer coordinates or addresses to an external map or routing service without approval.
- Design the dispatch queue for a phone first, with large touch targets and stop details easy to scan; keep the workflow usable on tablets and desktops.

### Stock and Promotions Staff

- Add and update products, prices, categories, availability, and stock counts.
- Create and maintain promotions.
- Keep order and customer data out of this view unless a specific merchandising task requires it.
- Support tablet and desktop editing, with responsive forms for occasional phone use.

### Driver

- Preview one selected demo driver’s assigned deliveries in the staff-selected stop order; this selector is not sign-in.
- Open one delivery at a time to review the recipient, phone number, delivery description, landmark, and driver instructions required for that stop.
- Update delivery progress using clear, thumb-friendly actions.
- Treat status updates as persisted order status. Do not claim live location sharing or automatically send exact locations to outside services.

## Viewports and Role Access

Viewport size describes the device layout; role describes which work and data a person can access. A responsive page alone does not provide role separation. In a production system, each dashboard must handle its expected screen sizes and restrict data and actions to the authenticated role. The current demo selector only chooses which page to preview.

Keep customer, driver, and dispatch experiences phone first. Catalogue work should be comfortable on tablets and desktops, with mobile fallback for urgent tasks. Manager overview should use wide screens well without hiding essential alerts on a phone.

## Access and Data Boundaries

The demo role picker at `/demo-login` illustrates the available experiences, but it is not secure authentication. Real staff accounts and permissions require an authentication and backend authorization design; hiding a section in the browser alone is not access control.

Use least-privilege access in a real system: drivers receive only their assigned delivery details; stock and promotions staff receive catalogue tools; order and dispatch staff receive the order details needed to fulfil deliveries; managers oversee the full store workspace. Customer location data stays within approved services and workflows.

## Suggested Route Map

These are demo destinations. Opening a staff route directly is possible and does not authenticate or authorize the visitor.

| Demo view                       | URL                                                       |
| ------------------------------- | --------------------------------------------------------- |
| Role selector                   | `/demo-login`                                             |
| Customer storefront and account | `/`, `/shop`, `/cart`, `/checkout`, `/account`, `/orders` |
| Manager / owner                 | `/admin`                                                  |
| Order and dispatch staff        | `/staff/dispatch`                                         |
| Stock and promotions staff      | `/staff/catalogue`                                        |
| Driver                          | `/driver`                                                 |

## Production Follow-up

1. Define staff identity, role membership, and authorization boundaries for the eventual backend.
2. Connect real sign-in and server-enforced permissions only when backend authentication is in scope.
