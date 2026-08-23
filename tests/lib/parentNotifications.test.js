jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Student", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("@/models/ParentStudentLink", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("@/models/UserNotification", () => ({
  __esModule: true,
  default: { insertMany: jest.fn().mockResolvedValue([]) },
}));
jest.mock("@/lib/webPush", () => ({
  sendPushToParents: jest.fn().mockResolvedValue({ sent: 1 }),
}));

import Student from "@/models/Student";
import ParentStudentLink from "@/models/ParentStudentLink";
import UserNotification from "@/models/UserNotification";
import { sendPushToParents } from "@/lib/webPush";
import { notifyGuardians } from "@/lib/parentNotifications";

beforeEach(() => {
  jest.clearAllMocks();
  Student.findById.mockReturnValue({
    select: () => ({
      lean: () => Promise.resolve({ _id: "student-1", name: "Aayush", school: "school-1" }),
    }),
  });
});

it("keeps a selected-parent message and phone push inside the exact audience", async () => {
  ParentStudentLink.find.mockImplementation((query) => ({
    select: () => ({
      lean: () =>
        Promise.resolve(
          [{ parent: "parent-1" }, { parent: "parent-2" }].filter((link) =>
            query.parent.$in.includes(link.parent)
          )
        ),
    }),
  }));

  const result = await notifyGuardians({
    studentId: "student-1",
    includeParentIds: ["parent-2"],
    enforceCategoryPermission: false,
    category: "MESSAGE",
    title: "Message from school",
    message: "Please call the office.",
    href: "/parent/messages",
  });

  expect(ParentStudentLink.find).toHaveBeenCalledWith(
    expect.objectContaining({
      student: "student-1",
      parent: { $in: ["parent-2"] },
    })
  );
  expect(result.sent).toBe(1);
  expect(UserNotification.insertMany).toHaveBeenCalledWith(
    [expect.objectContaining({ recipientParent: "parent-2" })],
    { ordered: false }
  );
  expect(sendPushToParents).toHaveBeenCalledWith(
    ["parent-2"],
    expect.objectContaining({ href: "/parent/messages" })
  );
});
