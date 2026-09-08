import {
  canAccessNotificationChannel,
  isNotificationChannel,
  parentNotificationsChannel,
} from "@/lib/notificationChannels";

const asParent = (id) => ({ user: { id, role: "PARENT" } });

describe("private parent notification channels", () => {
  it("uses a distinct namespace", () => {
    expect(parentNotificationsChannel("parent-a")).toBe(
      "parent-notifications:parent-a"
    );
    expect(isNotificationChannel("parent-notifications:parent-a")).toBe(true);
    expect(isNotificationChannel("public-feed")).toBe(false);
  });

  it("allows only the exact signed-in parent", () => {
    const channel = parentNotificationsChannel("parent-a");
    expect(canAccessNotificationChannel(channel, asParent("parent-a"))).toBe(
      true
    );
    expect(canAccessNotificationChannel(channel, asParent("parent-b"))).toBe(
      false
    );
    expect(
      canAccessNotificationChannel(channel, {
        user: { id: "school-a", role: "SCHOOL_ADMIN" },
      })
    ).toBe(false);
    expect(canAccessNotificationChannel(channel, null)).toBe(false);
  });

  it("rejects an empty recipient id and prefix lookalikes", () => {
    expect(
      canAccessNotificationChannel("parent-notifications:", asParent(""))
    ).toBe(false);
    expect(
      canAccessNotificationChannel(
        "parent-notifications-evil:parent-a",
        asParent("parent-a")
      )
    ).toBe(false);
  });
});
