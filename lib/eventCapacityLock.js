import crypto from "crypto";
import Event from "@/models/Event";

const DEFAULT_LEASE_MS = 120_000;
const DEFAULT_WAIT_MS = 10_000;
const RETRY_MS = 40;

export class EventCapacityBusyError extends Error {
  constructor() {
    super("Event registration is busy. Please try again.");
    this.name = "EventCapacityBusyError";
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function acquireEventCapacityLock(
  eventId,
  { leaseMs = DEFAULT_LEASE_MS, waitMs = DEFAULT_WAIT_MS } = {}
) {
  const token = crypto.randomUUID();
  const deadline = Date.now() + waitMs;

  do {
    const now = new Date();
    const locked = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $or: [
          { "capacityMutationLock.expiresAt": null },
          { "capacityMutationLock.expiresAt": { $exists: false } },
          { "capacityMutationLock.expiresAt": { $lte: now } },
        ],
      },
      {
        $set: {
          "capacityMutationLock.token": token,
          "capacityMutationLock.expiresAt": new Date(now.getTime() + leaseMs),
        },
      },
      { new: true }
    ).select("+capacityMutationLock.token +capacityMutationLock.expiresAt");

    if (locked) {
      return { event: locked, token };
    }

    if (Date.now() < deadline) {
      await delay(Math.min(RETRY_MS, deadline - Date.now()));
    }
  } while (Date.now() < deadline);

  throw new EventCapacityBusyError();
}

export async function releaseEventCapacityLock(eventId, token) {
  if (!token) return;

  await Event.updateOne(
    {
      _id: eventId,
      "capacityMutationLock.token": token,
    },
    {
      $set: {
        "capacityMutationLock.token": null,
        "capacityMutationLock.expiresAt": null,
      },
    }
  );
}
