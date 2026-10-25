---
name: Order cancellation policy
description: Cancellation semantics and order-transition concurrency.
---

Cancellation is for the customer's own pending order, before worker delivery.
Keep the cancelled record in customer history, but exclude it from preparation
queues and daily operational totals.

**Why:** Cancellation must not erase history or leave cancelled drinks counted as
orders to fulfil. Restricting it to pending orders avoids undoing worker handoff
or a customer's receipt confirmation.

**How to apply:** Do not turn cancellation into deletion. Any future change that
allows cancellation after delivery needs an explicit product decision. State
changes must check the previous state atomically in the database, so a concurrent
delivery cannot resurrect a cancelled order.

Ready-for-pickup is optional before worker delivery. A ready order remains in
the worker's preparation queue until handoff or the customer's pickup receipt.
Customers may collect from the buffet and confirm actual receipt themselves;
readiness alone must never count as delivery or completion.

**Why:** The user requested «الطلب جاهز» before «تم التسليم», an option for the
customer to collect at the buffet, and customer notifications for both actions.

**How to apply:** Send readiness and worker-delivery notifications only to that
order's owner in its project, using the existing notification system. Preserve
the normal worker-delivery/customer-confirmation path. Repeated readiness must
not send duplicate alerts, and pickup confirmation must not override cancellation.
