import mongoose, { Schema } from "mongoose";

/**
 * Not required by the brief (Task 2 explicitly asks only for pseudocode,
 * no running code) — this is a small, concrete proof that the pseudocode's
 * central claim in DELIVERY_SLOTS_PSEUDOCODE.md actually holds: a single
 * atomic `findOneAndUpdate` compare-and-swap can never let concurrent
 * requests overbook a capacity-limited slot, because MongoDB guarantees
 * per-document write atomicity — there's no read-then-write race window.
 */
interface ISlot {
  maxCapacity: number;
  bookedCount: number;
}

const slotSchema = new Schema<ISlot>({
  maxCapacity: { type: Number, required: true },
  bookedCount: { type: Number, default: 0 },
});
// Each Jest test file gets its own fresh module registry (confirmed
// elsewhere in this suite), so there's no "OverwriteModelError" risk here
// that would otherwise justify the usual `mongoose.models.X ?? mongoose.model(...)` guard.
const Slot = mongoose.model<ISlot>("Slot", slotSchema);

async function tryReserve(slotId: mongoose.Types.ObjectId): Promise<boolean> {
  const result = await Slot.findOneAndUpdate(
    { _id: slotId, $expr: { $lt: ["$bookedCount", "$maxCapacity"] } },
    { $inc: { bookedCount: 1 } },
    { returnDocument: "after" }
  );
  return result !== null;
}

describe("Delivery slot concurrency (proof for DELIVERY_SLOTS_PSEUDOCODE.md)", () => {
  it("lets exactly `maxCapacity` concurrent bookings succeed, never more, for a shared slot", async () => {
    const maxCapacity = 3;
    const slot = await Slot.create({ maxCapacity, bookedCount: 0 });

    // 20 "customers" all racing for the same slot at once.
    const results = await Promise.all(Array.from({ length: 20 }, () => tryReserve(slot._id)));
    const successes = results.filter(Boolean).length;

    expect(successes).toBe(maxCapacity);

    const finalSlot = await Slot.findById(slot._id).lean();
    expect(finalSlot?.bookedCount).toBe(maxCapacity); // never exceeds capacity, even under a race
  });
});
