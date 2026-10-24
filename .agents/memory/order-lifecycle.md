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
