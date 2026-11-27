# MoPay Sandbox Checkout Design

## Goal

Integrate MoPay Lesotho's hosted checkout into REETAPELE so a customer can pay a grocery checkout with M-Pesa, EcoCash, or a card in the MoPay sandbox. Keep cash on delivery and manually verified mobile money available. Do not enable or deploy live payments as part of this slice.

## Current Context

- Convex creates customer orders and a `checkouts` record containing the server-calculated total and the linked store orders.
- The order payment model currently supports cash on delivery and manually verified mobile money. Card is rejected by the backend.
- `convex/http.ts` currently registers Convex Auth routes only.
- The checked-in E2E environment files contain test account variables, but no MoPay variable names or key. No MoPay key is present in the current shell.
- The current working tree has uncommitted customer-localization work. It remains in place while this feature is developed.

## Approaches Considered

1. **One hosted payment session per customer checkout (selected).** The backend uses the persisted checkout total, creates one MoPay session, and redirects the customer to MoPay. This fits the current first-party pilot and single checkout confirmation flow. All linked store orders share the verified payment result.
2. **One hosted payment session per store order.** This separates store payment outcomes, but introduces multiple sessions, partial-payment states, and a more complex customer retry flow. It is a better marketplace settlement discussion for a later slice.
3. **Keep all payments manual and defer MoPay.** This minimizes payment integration risk, but does not let the team test provider-backed checkout now. It is not selected.

## Customer Flow

1. The customer selects **MoPay** in checkout. The checkout label explains that MoPay supports M-Pesa, EcoCash, and card; the customer selects the actual rail on MoPay's hosted page.
2. REETAPELE creates its normal order and checkout records. The backend reads the persisted checkout total and order IDs; it never accepts a payment amount from the browser.
3. An authenticated Convex action validates that the customer owns the checkout, creates a MoPay hosted payment session, and stores its session ID, opaque alphanumeric reference, expected amount, and lifecycle state against the checkout before returning the hosted URL.
4. The browser navigates to MoPay. The API key and webhook token never reach browser code.
5. MoPay returns the customer to the order confirmation/payment result screen. Redirect query parameters are display hints only.
6. The backend loads the session ID already stored for the authenticated customer's checkout and retrieves the session from MoPay. It verifies the session ID, reference, expected amount, and successful session/transaction statuses before marking the linked orders paid.
7. MoPay's webhook provides a second update path. The HTTP endpoint verifies the configured bearer token, validates the event shape and event ID, reads current session state from MoPay, and applies the result idempotently.

## Data and State

- Add a provider-backed payment method distinct from the existing manual `mobile_money` method and cash on delivery. Record the selected MoPay rail (`mpesa`, `ecocash`, or `card`) when MoPay confirms it.
- Add a checkout-level MoPay payment record tied to `checkoutId`, linked order IDs, a unique alphanumeric reference per payment attempt, expected Maloti amount, provider session ID, hosted URL/state as needed for safe retries, provider transaction ID, selected rail, and timestamps. Retries after a known terminal state use a new reference; an attempt with an unknown provider outcome is reconciled before retrying.
- Keep order payment status `pending` until server-side verification. A verified success updates every linked order to `paid` in one Convex mutation. Pending, failed, cancelled, and expired provider states remain visible on the checkout/payment record and never become paid.
- Deduplicate webhook deliveries by provider event ID. Repeated events and repeated customer returns must not create duplicate payment records or duplicate order events.
- Do not let staff manually set a MoPay payment to paid through the existing manual-payment control. Manual verification remains available for the existing manual mobile-money method.
- Do not automatically create a second MoPay session after a timeout that leaves the original creation outcome unknown. Reconcile the first attempt before allowing a new one, to avoid double payment requests.

## Security and Environment

- Use the MoPay Lesotho hosted payment-session API and session retrieval endpoint documented at <https://mopay.co.ls/docs>.
- Keep `MOPAY_API_KEY` and a separately generated `MOPAY_WEBHOOK_TOKEN` in Convex development deployment environment variables. Never put them in `VITE_*`, browser storage, source files, E2E account credentials, or logs.
- Configure only a MoPay project whose API key is for `SANDBOX`; do not add a production key or configure a production deployment in this slice.
- Keep references alphanumeric and free of customer personal data. Compare the provider amount against the server-owned checkout total using a two-decimal Maloti string.
- MoPay requires an HTTPS redirect URL. Local development can exercise the UI and mocked API, but the full external sandbox redirect and browser walkthrough will use this feature branch's HTTPS Netlify Deploy Preview, not `http://127.0.0.1:7093`.
- Confirm a payment from the saved session and provider state, never from client-supplied `status`, `transactionId`, `amount`, or `sessionId` query parameters alone.
- Do not interpret a multi-store session as merchant settlement. The single hosted payment goes to the configured MoPay project; payout splitting and refunds remain out of scope.

## Errors and Recovery

- If session creation definitively fails, keep the grocery orders pending and show a localized retry/support state; do not erase the order or cart history.
- If the provider request times out after it may have created a session, mark the attempt as unknown and reconcile it instead of creating another session immediately.
- If MoPay reports pending, cancelled, failed, or expired, leave all orders unpaid and show the customer the current state and a safe retry path when the original attempt is known to be terminal.
- If the provider confirms payment after an order has been cancelled/rejected, retain the verified payment evidence and surface it for staff support/refund handling. Do not pretend the payment failed or silently recreate an order.
- Refund execution and live settlement are not part of this sandbox slice.

## Verification

- Add Convex tests for checkout ownership, server-calculated amount/reference, correct mapping of one session to multiple linked orders, and atomic paid updates.
- Mock MoPay create-session and get-session responses for successful, pending, failed, cancelled, expired, malformed, wrong-amount, wrong-reference, and mismatched-session cases.
- Test duplicate and out-of-order webhook deliveries, invalid bearer tokens, replayed event IDs, tampered redirect query parameters, and attempts by staff to manually mark a provider payment paid.
- Run focused unit/Convex tests and build/typecheck after implementation.
- When a MoPay sandbox key is configured, run a browser walkthrough against the sandbox for M-Pesa, EcoCash, and card. MoPay documents preset Lesotho M-Pesa and EcoCash numbers for outcome testing; use card test details only from the MoPay sandbox dashboard/docs.
- Push this feature branch and use its Netlify Deploy Preview for the full sandbox walkthrough because MoPay rejects non-HTTPS redirect URLs. The test API key and webhook token remain configured only in the Convex development deployment.
- Never run these checks against a live MoPay project or production customer data.

## Scope Boundaries

Included: hosted MoPay session creation, return verification, webhook reconciliation, customer status/retry UI, payment status audit history, and sandbox tests for all three hosted rails.

Excluded: live payments, payout/settlement splitting, automatic refunds, subscriptions, saved cards, recurring payments, merchant onboarding, and removal of cash/manual mobile money.

## Source

- MoPay Lesotho integration guide: <https://mopay.co.ls/docs>
- The user approved one hosted payment session for the full checkout and requested M-Pesa, EcoCash, and card support in sandbox.
