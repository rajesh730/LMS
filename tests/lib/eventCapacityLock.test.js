jest.mock("@/models/Event", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

import Event from "@/models/Event";
import {
  acquireEventCapacityLock,
  EventCapacityBusyError,
  releaseEventCapacityLock,
} from "@/lib/eventCapacityLock";

describe("event capacity mutation lock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("atomically claims an expired or absent lock", async () => {
    const event = { _id: "event-1" };
    const select = jest.fn().mockResolvedValue(event);
    Event.findOneAndUpdate.mockReturnValue({ select });

    const result = await acquireEventCapacityLock("event-1", { waitMs: 0 });

    expect(result.event).toBe(event);
    expect(result.token).toEqual(expect.any(String));
    expect(Event.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "event-1",
        $or: expect.any(Array),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "capacityMutationLock.token": result.token,
          "capacityMutationLock.expiresAt": expect.any(Date),
        }),
      }),
      { new: true }
    );
  });

  it("fails cleanly when another mutation owns the lock", async () => {
    Event.findOneAndUpdate.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      acquireEventCapacityLock("event-1", { waitMs: 0 })
    ).rejects.toBeInstanceOf(EventCapacityBusyError);
  });

  it("releases only the lock matching its ownership token", async () => {
    Event.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await releaseEventCapacityLock("event-1", "owner-token");

    expect(Event.updateOne).toHaveBeenCalledWith(
      {
        _id: "event-1",
        "capacityMutationLock.token": "owner-token",
      },
      {
        $set: {
          "capacityMutationLock.token": null,
          "capacityMutationLock.expiresAt": null,
        },
      }
    );
  });
});
