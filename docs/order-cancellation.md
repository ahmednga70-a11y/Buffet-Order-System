# Customer order cancellation

Customers can cancel only their own pending orders in their selected project.
The card in “طلباتي” asks for confirmation, with a separate way to return without
cancelling. Cancellation stores status `cancelled`; it does not delete the order.
Cancelled cards display “ملغي” and have no urgency, delivery-confirmation or
cancellation controls. They remain in the customer's history after reload.

The worker's pending list refreshes every five seconds and excludes cancelled
orders. Daily statistics also exclude cancelled orders and their item/user counts.
Completed-order lists are unchanged.

`PATCH /api/orders/:id/cancel` requires a customer session, ownership and project
match. Repeating cancellation returns the existing cancelled order. Delivered and
completed orders cannot be cancelled. All order-state transitions now condition
their writes on the expected previous status: if cancellation races worker
delivery, only one succeeds; the loser returns HTTP 409.

This extends an existing text status, so no new database column is required.
Deploy API and web client together on the existing Vercel setup. A native APK
must be rebuilt to show the new control. Development verification does not deploy
the change to Vercel or mutate production Neon data.

Regression coverage:
`pnpm --filter @workspace/api-server run test:order-features`
