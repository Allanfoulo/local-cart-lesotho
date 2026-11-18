# REETAPELE Pilot Readiness Checklist

**Purpose:** Go/no-go record for a controlled first-party Ha-Matala pilot. A successful development build alone is not a launch decision.  
**Status:** Not ready for launch; evidence and owner sign-offs below remain open unless explicitly recorded as verified.

## A. Product and service area

- [ ] Confirm Phase I, Phase II or both; document approved operational boundary or named-area/landmark eligibility method.
- [ ] Configure the pilot zones and disable all unsupported areas without deployment.
- [ ] Confirm each zone's delivery fee, minimum order, opening hours and contact/landmark guidance.
- [ ] Confirm exact real product catalogue, units/weight options, photos, prices, availability and stock.
- [ ] Verify storefront and checkout only offer supported, currently active delivery areas.
- [ ] Confirm English and Sesotho customer journeys and fluent-speaker review of money, payment and delivery wording.
- [ ] Confirm support phone/WhatsApp/email ownership and staffed response hours.

## B. Payment and order integrity

- [ ] Staff demonstrate the configured cash procedure, change handling and payment status recording.
- [ ] Staff demonstrate manual mobile-money reference verification; pending is not labeled paid.
- [ ] Card payment remains unavailable unless separately integrated and approved.
- [ ] Double-submit/refresh/network retry creates no duplicate checkout.
- [ ] Price, stock, fee and minimum are revalidated server-side.
- [ ] Failed/unavailable item, closed store, cancelled, rejected and uncertain checkout recovery are documented and practiced.
- [ ] Store child orders can be handled independently if multi-store checkout remains enabled.

## C. Fulfilment and delivery

- [ ] Staff accounts, active memberships and least-privilege permissions are checked.
- [ ] Order assignment, photo checklist, quantities and prepared/ready gating work on phones used in-store.
- [ ] Dispatch assigns only active drivers for the correct store.
- [ ] Driver can see and update assigned deliveries; another/unassigned driver is denied.
- [ ] Driver and customer can complete handoff using confirmation code.
- [ ] GPS denial, weak connection, stale location, no answer, wrong landmark and failed delivery have fallback procedures.
- [ ] Completion and exception records show actor, time and reason.
- [ ] Customer can see accurate order progress and a real support route; notification delivery failures are visible.

## D. Security, deployment and operations

- [ ] Netlify preview and production point to their intended, separate Convex environments.
- [ ] Production Auth, email sender/domain, site origins and support configuration are verified by the owner.
- [ ] No development credentials or test accounts are used in production; exposed secrets have been rotated.
- [ ] Cross-store, wrong-role, unauthorized customer, invalid driver, duplicate checkout/payment and unauthorized completion tests pass.
- [ ] Monitoring, incident reporting, backup schedule and recovery responsibility are configured and an exercise is recorded.
- [ ] Staff escalation owner and customer complaint process are published to the pilot team.
- [ ] No production launch proceeds solely because a build, unit suite or Deploy Preview passed.

## E. End-to-end evidence

- [ ] Current PR/production candidate SHA and environment are recorded.
- [ ] Synthetic test covers browse → account → supported address → checkout → staff accept → prepare → assign → dispatch → confirmation → customer history.
- [ ] Separate test covers email verification and checkout state preservation.
- [ ] Separate tests cover insufficient stock/concurrent checkout and idempotent retry.
- [ ] Separate tests cover rejection/cancellation/unavailable item/failed delivery.
- [ ] If two-store checkout remains available, test independent store queues, correct per-store fees/status and sibling-order recovery.
- [ ] Repeat critical browser walkthrough at phone and desktop sizes, in both locales.
- [ ] Complete and reconcile controlled end-to-end real pilot test orders with non-customer/staff-controlled participants before inviting the public.
- [ ] Record defects, fixes, retest results and operational owner sign-off.

## F. Operating metrics

Capture a baseline during controlled orders, then agree target thresholds with the store operator before expanding audience. Do not invent a target without pilot evidence.

| Metric | Definition to record | Review cadence |
|---|---|---|
| Order fulfilment success rate | Orders delivered / orders accepted for fulfilment; report cancellations and failures separately | Daily during pilot, then weekly |
| Order accuracy | Orders with no missing, wrong or damaged items / delivered orders | Per order, summarized weekly |
| On-time delivery | Delivered within the customer-visible agreed window / delivered orders | Weekly, only after reliable windows exist |
| Average preparation time | Accepted/confirmed to ready timestamp; report median and tail | Daily/weekly |
| Delivery cost per order | Driver and delivery operating cost attributable to fulfilled orders / fulfilled orders | Weekly |
| Failed and cancelled orders | Count and rate by reason, store, zone and lifecycle stage | Daily |
| Customer complaints | Count, issue type, response time and resolution | Daily/weekly |
| Repeat-order rate | Returning customers placing another order in an agreed time window | Monthly, after enough cohort data |

## Go/no-go rule

**Go** only for a controlled pilot when sections A–E have evidence, the first-party store accepts the operating procedure, and payment/support/recovery owners are named. Expand beyond the controlled cohort only after metrics show reliable fulfilment and the store agrees on thresholds. **No-go** if the service boundary is unconfirmed, orders can be duplicated/oversold/misrouted, customers cannot understand payment or status, staff cannot recover exceptions, monitoring/support are unavailable, or production configuration is unverified. No unrestricted public launch is recommended by this checklist.
