jest.mock("@/models/UserNotification", () => ({
  __esModule: true,
  default: {
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock("@/lib/parentNotifications", () => ({
  notifyGuardians: jest.fn().mockResolvedValue({ sent: 1 }),
}));

import UserNotification from "@/models/UserNotification";
import { notifyGuardians } from "@/lib/parentNotifications";
import { syncAchievementNotifications } from "@/lib/achievementNotifications";

beforeEach(() => jest.clearAllMocks());

it("notifies the student and guardians when an event result is published", async () => {
  const count = await syncAchievementNotifications({
    event: { _id: "event-1", title: "Science Fair" },
    achievements: [
      {
        _id: "achievement-1",
        student: "student-1",
        school: "school-1",
        placement: "WINNER",
        recipientType: "STUDENT",
        certificateUrl: "/certificates/achievement-1",
      },
    ],
  });

  expect(count).toBe(1);
  expect(UserNotification.insertMany).toHaveBeenCalledWith([
    expect.objectContaining({
      targetRole: "STUDENT",
      recipientStudent: "student-1",
      category: "ACHIEVEMENT",
    }),
  ]);
  expect(notifyGuardians).toHaveBeenCalledWith(
    expect.objectContaining({
      studentId: "student-1",
      category: "ACHIEVEMENT",
      priority: "POSITIVE",
      href: "/parent/portfolio",
      metadata: expect.objectContaining({ eventId: "event-1" }),
    })
  );
});

it("does not notify a TEAM container row separately", async () => {
  const count = await syncAchievementNotifications({
    event: { _id: "event-1", title: "Quiz" },
    achievements: [
      {
        _id: "team-1",
        student: "captain-1",
        school: "school-1",
        placement: "WINNER",
        recipientType: "TEAM",
      },
    ],
  });

  expect(count).toBe(0);
  expect(UserNotification.insertMany).not.toHaveBeenCalled();
  expect(notifyGuardians).not.toHaveBeenCalled();
});
