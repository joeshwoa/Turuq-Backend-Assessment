# Task 2 — Dynamic Delivery Slot Allocation (Detailed Pseudocode)

This is the "detailed" style the brief offers bonus points for: it accounts
for edge cases, explicit initialization/update steps, and closes with a
worked example. No running code is included — per the brief, this is a
design document only. (A small, optional proof that the core concurrency
mechanism actually works, using real MongoDB, lives in
`tests/concurrency.demo.test.ts` in this repo — not required, just extra
confidence that the claim below isn't just asserted.)

## 1. Data model

```
Slot:
  slotId          # unique identifier
  zone            # delivery area/region this slot serves
  date            # calendar date
  startTime       # e.g. 14:00
  endTime         # e.g. 16:00
  maxCapacity     # total orders this slot can carry
  bookedCount     # orders currently booked into this slot (starts at 0)
  status          # "open" | "closed" (e.g. past slots, or manually disabled)

Booking:
  bookingId
  orderId
  customerId
  slotId
  idempotencyKey  # supplied by the client, see §5
  status          # "confirmed" | "cancelled"
  createdAt
```

`bookedCount` and `maxCapacity` living on the same `Slot` record — rather
than, say, computing `bookedCount` on the fly by counting `Booking` rows
every time — is what makes the single atomic update in §3 possible at all.

## 2. Initialization

```
function generateSlotsForZone(zone, forDate):
  for each (startTime, endTime) in the zone's configured time windows:
    if a Slot for (zone, forDate, startTime) does not already exist:
      create Slot {
        zone, date: forDate, startTime, endTime,
        maxCapacity: zone.defaultCapacity,
        bookedCount: 0,
        status: "open"
      }
```

Run this ahead of time (e.g. a nightly job generating the next N days) so a
slot always exists before a customer can ever try to book it.

## 3. Booking a preferred slot — the core operation

This is the part the brief calls out specifically: slots are a **shared
resource**, and the system must prevent overbooking under concurrent
requests, not just under a single request at a time.

```
function requestBooking(orderId, customerId, preferredSlotId, idempotencyKey):

  # Idempotency: a client retry (e.g. after a network timeout, never
  # knowing if the first attempt actually landed) must not create a
  # second booking.
  existing = Booking.findOne({ idempotencyKey })
  if existing exists:
    return { status: "CONFIRMED", booking: existing }   # replay, not a new booking

  slot = Slot.findOne({ slotId: preferredSlotId })
  if slot does not exist or slot.status != "open" or slot.date is in the past:
    return { status: "SLOT_UNAVAILABLE", message: "This slot can no longer be booked" }

  # Reject a customer double-booking the SAME slot for the SAME order
  # (distinct from the concurrency problem below — this is an application
  # rule, enforced with a uniqueness guard on (slotId, customerId, orderId)).
  duplicate = Booking.findOne({ slotId: preferredSlotId, customerId, orderId, status: "confirmed" })
  if duplicate exists:
    return { status: "CONFIRMED", booking: duplicate }

  # --- THE ATOMIC STEP ---
  # A single conditional update, not "read bookedCount, check it client-side,
  # then write" — that pattern has a race window: two requests can both read
  # bookedCount=9/10, both decide "there's room," and both write, landing at
  # 11/10. Instead, the capacity check and the increment happen in the SAME
  # atomic database operation. MongoDB guarantees a single document write is
  # atomic, so of any number of concurrent callers hitting this on the same
  # slot, each one either fully succeeds (and the next caller sees the
  # updated count) or fully fails (finds the filter no longer matches) —
  # there is no in-between state a second request could exploit.
  updatedSlot = Slot.findOneAndUpdate(
    filter: { slotId: preferredSlotId, status: "open", bookedCount: { less_than: maxCapacity } },
    update: { increment: { bookedCount: 1 } }
  )

  if updatedSlot is null:
    # Either the slot filled up between the customer viewing it and
    # submitting (a real, expected race — not an error), or it closed.
    alternatives = findAlternativeSlots(preferredSlotId, customerId)
    return { status: "ALTERNATIVES_SUGGESTED", alternatives }

  booking = Booking.create({
    orderId, customerId, slotId: preferredSlotId, idempotencyKey, status: "confirmed"
  })
  return { status: "CONFIRMED", booking }
```

## 4. Suggesting alternatives when the preferred slot is full

```
function findAlternativeSlots(originalSlotId, customerId):
  original = Slot.findOne({ slotId: originalSlotId })

  candidates = Slot.find({
    zone: original.zone,
    date: original.date,               # same day first; widen to +1/+2 days if empty
    status: "open",
    bookedCount: { less_than: maxCapacity }
  })

  sorted = sort candidates by |candidate.startTime - original.startTime|  # nearest in time first
  topChoices = take the first 3 from sorted

  return topChoices.map(slot => {
    slotId: slot.slotId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    remainingCapacity: slot.maxCapacity - slot.bookedCount,
    isClickable: true    # true at the moment this list was built — see note below
  })
```

**Important caveat, stated explicitly rather than glossed over:** `isClickable`
here is a snapshot at query time, not a live guarantee — another customer
could book the last spot in an alternative slot in the moment between it
being *shown* and the customer *clicking* it. That's fine: the customer's
actual click re-runs the exact same atomic step from §3 against that slot,
which is the only place correctness is actually enforced. The list is a
helpful hint for the UI ("these look available right now"), not a second
source of truth.

## 5. Confirming a suggested alternative

```
function confirmAlternativeSlot(customerId, orderId, chosenSlotId, idempotencyKey):
  # Exactly the same atomic operation as the original booking attempt —
  # deliberately reusing requestBooking rather than a separate code path,
  # so there is only one place the capacity guarantee is implemented.
  return requestBooking(orderId, customerId, chosenSlotId, idempotencyKey)

  # If someone else took the last spot in the split second between this
  # slot being suggested and the customer clicking it, this naturally
  # returns ALTERNATIVES_SUGGESTED again with a fresh list — the same
  # "no overbooking, ever" guarantee applies on every attempt, not just
  # the first.
```

## 6. Cancelling a booking

```
function cancelBooking(bookingId):
  booking = Booking.findOne({ bookingId })
  if booking does not exist or booking.status == "cancelled":
    return { status: "ALREADY_CANCELLED" }   # idempotent — cancelling twice is a no-op, not an error

  # Guarded the same way as the increment: only decrement if bookedCount > 0,
  # so a duplicate/racing cancel can never push the count negative.
  Slot.findOneAndUpdate(
    filter: { slotId: booking.slotId, bookedCount: { greater_than: 0 } },
    update: { increment: { bookedCount: -1 } }
  )

  booking.status = "cancelled"
  booking.save()
  return { status: "CANCELLED" }
```

## 7. Real-time feedback for the customer-facing app

```
function getSlotsForDisplay(zone, date):
  slots = Slot.find({ zone, date, status: "open" })
  return slots.map(slot => {
    slotId: slot.slotId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isClickable: slot.bookedCount < slot.maxCapacity   # drives the app's disabled/enabled state directly
  })
```

This is what backs the brief's example flow: "available slots are clickable
while fully booked slots are disabled." Same caveat as §4 — it's the
UI's hint, not the enforcement mechanism; the enforcement is always the
atomic step in §3, re-checked on every actual booking attempt.

## 8. Edge cases this design accounts for

- **Race for the last spot** — solved structurally by the atomic
  compare-and-swap in §3, not by locking or by re-checking after the fact.
- **Overbooking** — impossible by construction: the update's filter
  excludes any slot that isn't strictly under capacity, so `bookedCount`
  can never be written past `maxCapacity`.
- **Double-booking** (same customer, same order, same slot, retried) —
  guarded by the idempotency key check (§3) and the
  `(slotId, customerId, orderId)` lookup.
- **Cancel racing with a new booking** — both are separate atomic
  operations on the same document; MongoDB serializes them, so whichever
  reaches the database first is applied first, no lost updates either way.
- **Booking a past or closed slot** — checked explicitly before the atomic
  step even runs.
- **Client retry after a timeout** — the idempotency key means a retried
  request either returns the original confirmed booking or safely
  re-attempts, never creates a duplicate.

## 9. Worked example

1. Customer selects an order and wants delivery between 14:00–16:00 today.
2. `getSlotsForDisplay` shows six slots; 14:00–16:00 shows as disabled
   (`bookedCount = maxCapacity = 10`).
3. Customer taps the (enabled) 16:00–18:00 slot and submits.
4. `requestBooking` runs the atomic update against the 16:00–18:00 slot;
   it still has room, so the filter matches, `bookedCount` becomes 6/10,
   and a `Booking` is created — response: `CONFIRMED`.
5. A moment later, a second customer also tries 16:00–18:00 when it's at
   9/10. Their request and a third customer's request both fire at
   nearly the same instant.
6. Both hit the same atomic `findOneAndUpdate`. MongoDB processes them one
   at a time internally: the first sees `bookedCount: 9 < 10`, matches,
   becomes 10/10, and succeeds. The second, now facing `bookedCount: 10`,
   fails the filter and gets `null` back — no read-then-write race
   existed for either of them to exploit.
7. The second customer's request falls into `findAlternativeSlots`,
   which returns 18:00–20:00 (same day, next nearest, has room).
8. They confirm 18:00–20:00 via `confirmAlternativeSlot`, which re-runs
   the exact same atomic step against the new slot and succeeds.
9. Final state: 16:00–18:00 is at capacity (10/10, no overbooking, ever),
   18:00–20:00 has one more booking than before — both counts are exactly
   correct despite the concurrent requests.
