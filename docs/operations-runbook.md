# REETAPELE Development Operations Runbook

Status: development and staging procedures. This is not a production launch approval.

Support contact for development issues: `allanfdeveloper@gmail.com`.

The marketplace domain has not been purchased yet. When it is available, replace development-facing links and support details with the approved marketplace domain and contact. `allanfdeveloper.space` is Allan's personal portfolio and is only the current verified Resend sender domain; it is not the marketplace site.

## Environment boundaries

- Local app: `http://localhost:7093`, backed by the selected Convex development deployment.
- Netlify deploy previews must use a non-production Convex deployment and synthetic/test accounts. Confirm `VITE_CONVEX_URL` before accepting orders in a preview.
- Production needs its own Netlify Production `VITE_CONVEX_URL` and its own Convex Auth/email variables. Never copy development secrets into production.
- Payment provider integrations are deferred. Do not represent an order as paid based only on an unverified customer claim or a client-side status. Use only payment methods and statuses currently supported by the app.

## Monitoring and triage

1. Check the Netlify deploy and build status for the affected deploy. Record the deploy URL, commit SHA, and time first observed.
2. Check the Convex dashboard for the deployment configured in that deploy. On **Logs**, filter for failed executions, function name, severity, or the Convex request ID shown in the browser. The dashboard log view is a short recent history; retain a separate log stream if longer retention and alerting are required.
3. For a customer or staff report, capture the approximate time, route, role/workspace, order reference if applicable, and request ID. Do not ask for passwords, one-time codes, access tokens, or full payment details.
4. Check whether the issue affects sign-in/email, catalog browsing, checkout/order creation, or fulfillment. Avoid retrying a checkout if its first response is uncertain; first look up whether an order was created to prevent a duplicate.
5. Record impact, affected deployment, steps taken, and resolution in the incident record. Escalate deployment access, suspected data exposure, or possible data loss to the Convex/Netlify project owner and the development support contact.

### Alerts to configure

Configure Netlify deploy notifications for deploy started, succeeded, failed, and restored events. Review Convex deployment logs and metrics; add a log stream or external alerting if the required retention/notification behavior is not available in the dashboard. The current workspace cannot verify that these notifications or streams are enabled.

## Recovery procedures

### Failed frontend deploy

1. Stop promotion of the failed build and identify the last known-good successful deploy.
2. In the correct Netlify site's Deploys page, publish that successful deploy using **Publish deploy**. This is an instant frontend rollback; record the deploy IDs and reason.
3. Confirm the public URL loads and that it still points to the intended Convex deployment. A frontend rollback does not roll back Convex code, environment variables, or database state.
4. If a later Git-triggered deploy is configured to auto-publish, it can supersede the rollback. Fix forward or coordinate publishing/auto-publishing with the site owner.

### Convex data or backend incident

1. Stop risky order/staff actions and preserve the request IDs, timestamps, order references, and affected deployment.
2. Do not restore a backup as an exploratory step. Convex restore replaces current table data and is destructive. Ask the deployment owner to take an additional backup before any restore.
3. Select a known-good backup from the same deployment (or an authorized same-team source), and have the owner approve and perform the restore in the Convex dashboard. Verify critical order and membership records afterward.
4. Restore backend code and environment variables separately if needed; a database backup does not contain code, deployment configuration, environment variables, or pending scheduled functions.
5. If rollback cannot safely resolve the issue, contact Convex support through the deployment dashboard and keep the affected workflow paused until verified.

### Auth/email incident

Check Convex logs for the failing auth action and request ID, verify the selected deployment's auth/email configuration in the owner dashboard, and confirm the sender/domain is verified in Resend. Never paste API keys into logs, tickets, Git, or chat. If a key may have been exposed, revoke it in Resend and set a replacement only on the intended Convex deployment; then test with a controlled non-production account.

### Order or payment incident

1. Search the order and event history before retrying any action. Use server state as the source of truth.
2. For duplicate, missing, stuck, or misrouted orders, pause fulfillment for the affected order and escalate to the store owner/manager and platform operator. Record the order ID and last confirmed event.
3. For payment disputes, follow the actual method configured for that order and reconcile against its external record where one exists. Payment-provider integrations are not yet available; do not claim provider settlement, refund, or webhook reconciliation is supported.
4. Resume fulfillment only after the store and customer-facing order state agree with the recorded outcome.

## Staging acceptance record

Use only a Netlify Deploy Preview connected to a development/staging Convex deployment, synthetic test accounts, and test catalog/order data. The Playwright walkthrough can consume stock and leave a completed order; see [E2E testing](e2e-testing.md) and reset/restore only in a non-production deployment.

Record for each run:

- Date/time, preview URL, commit SHA, and Convex deployment name (never a deployment secret).
- Test roles and synthetic account labels; do not record passwords, OTPs, or tokens.
- Results for store onboarding, invitations, workspace boundaries, guest/account checkout, multi-store order status, manager fulfillment, dispatch, and driver completion.
- Any cross-store/wrong-role denial, duplicate-submit behavior, failed email, recovery action, defect reference, and retest result.
- Name of the person who confirmed the preview uses non-production data.

### PR #3 report, 2026-10-22

The user reported that PR #3 head `fad5cc1` passed the mobile marketplace smoke test, manager checklist and private storefront preview, catalogue search/filters, marketplace links, driver workspace, and targeted manager preparation/driver assignment and driver delivery confirmation. Three synthetic development orders were created and all were advanced to Delivered. The receipt locator and current dispatch/delivery labels were corrected; after a toast wait and a longer multi-role test timeout, the signed-in customer checkout-to-delivery Playwright test passed on the PR #3 Deploy Preview on 2026-10-22. The public mobile preview smoke also passed. One interrupted synthetic order was completed through the driver account. Admin/owner onboarding, invitations, guest checkout, and cross-store denial were not covered by this run. See the [PR test report](https://github.com/Allanfoulo/local-cart-lesotho/pull/3).

Do not run the complete journey on production data. Before replaying checkout, check for an order created by the prior attempt. For the detailed workflow and negative authorization cases, use the checklist in [Phase 5 readiness](phase-5-readiness.md).

## Incident note template

```text
Incident reference:
First observed (UTC):
Affected environment/deploy/commit:
Affected role and workflow:
Impact:
Order/request IDs (if applicable):
Actions taken and by whom:
Recovery/rollback result:
Follow-up and retest:
```

## Platform references

- [Convex logs](https://docs.convex.dev/dashboard/deployments/logs)
- [Convex backup and restore](https://docs.convex.dev/database/backup-restore)
- [Netlify deploy management and rollback](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/)
- [Netlify deploy notifications](https://docs.netlify.com/deploy/deploy-notifications/)
