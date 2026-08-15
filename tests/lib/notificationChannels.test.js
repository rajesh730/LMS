jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentNotifications", () => ({
  notifyGuardians: jest.fn().mockResolvedValue({ sent: 1 }),
}));
jest.mock("@/lib/emailService", () => ({
  sendNoticeEmail: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("@/models/Notice", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/NoticeReceipt", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/ParentStudentLink", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Parent", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/Student", () => ({ __esModule: true, default: {} }));
jest.mock("@/models/User", () => ({ __esModule: true, default: {} }));

import { notifyGuardians } from "@/lib/parentNotifications";
import { sendNoticeEmail } from "@/lib/emailService";
import {
  InAppNotificationChannel,
  EmailNotificationChannel,
  OfflineDeliveryChannel,
  SmsNotificationChannel,
} from "@/lib/notifications/channels";
import { normalizeNoticePriority } from "@/lib/notifications/NotificationChannel";
import { describeReachability } from "@/lib/notifications/service";

/**
 * §33–§36. Two things are load-bearing:
 *   1. SMS must be an inert adapter — no paid provider is called.
 *   2. A guardian with no email and no phone must NOT be described as
 *      unreachable if they have Pravyo access.
 */

const student = { _id: "student-1", name: "Aayush", school: "school-1" };

function recipient(parentOverrides = {}, linkOverrides = {}) {
  return {
    parent: {
      _id: "parent-1",
      name: "Sita Sharma",
      accessState: "ACTIVATED",
      status: "ACTIVE",
      email: null,
      phone: null,
      ...parentOverrides,
    },
    student,
    link: { canReceiveNotices: true, ...linkOverrides },
  };
}

const notice = {
  _id: "notice-1",
  title: "Parent meeting",
  content: "Please attend on Friday.",
};

beforeEach(() => jest.clearAllMocks());

describe("priority mapping (§26)", () => {
  it.each([
    [{ priority: "URGENT" }, "URGENT"],
    [{ type: "URGENT" }, "URGENT"],
    [{ requiresConsent: true }, "IMPORTANT"],
    [{ requiresAcknowledgement: true }, "IMPORTANT"],
    [{ priority: "HIGH" }, "IMPORTANT"],
    [{ type: "SHOWCASE" }, "POSITIVE"],
    [{}, "GENERAL"],
  ])("%o -> %s", (input, expected) => {
    expect(normalizeNoticePriority(input)).toBe(expected);
  });
});

describe("in-app channel", () => {
  const channel = new InAppNotificationChannel();

  it("is always configured and used at every priority", () => {
    expect(channel.isConfigured()).toBe(true);
    expect(channel.shouldSendFor("GENERAL")).toBe(true);
    expect(channel.shouldSendFor("POSITIVE")).toBe(true);
  });

  it("reaches an ACTIVATED guardian with no email and no phone", () => {
    // The whole premise of the Parent Access Card.
    expect(channel.canReach(recipient())).toBe(true);
  });

  it("does NOT reach a guardian whose card was never activated", () => {
    // Counting them as reached would hide the family most at risk of missing
    // the notice from the offline follow-up list.
    expect(
      channel.canReach(recipient({ accessState: "PENDING_ACTIVATION" }))
    ).toBe(false);
  });

  it("does not reach a guardian without notice permission", () => {
    expect(channel.canReach(recipient({}, { canReceiveNotices: false }))).toBe(
      false
    );
  });

  it("sends and names the child", async () => {
    const result = await channel.send({
      notice,
      recipients: [recipient()],
      priority: "IMPORTANT",
    });

    expect(result.status).toBe("SENT");
    expect(notifyGuardians).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "student-1", category: "NOTICE" })
    );
  });

  it("marks a consent notice with the CONSENT category", async () => {
    await channel.send({
      notice: { ...notice, requiresConsent: true },
      recipients: [recipient()],
      priority: "IMPORTANT",
    });
    expect(notifyGuardians).toHaveBeenCalledWith(
      expect.objectContaining({ category: "CONSENT" })
    );
  });
});

describe("email channel (§31, §32)", () => {
  const channel = new EmailNotificationChannel();
  const original = process.env;

  afterEach(() => {
    process.env = original;
  });

  it("is unavailable with no transport configured", async () => {
    process.env = { ...original, SMTP_HOST: "", RESEND_API_KEY: "" };
    expect(channel.isConfigured()).toBe(false);

    const result = await channel.send({ notice, recipients: [recipient()] });
    expect(result.status).toBe("UNAVAILABLE");
    expect(sendNoticeEmail).not.toHaveBeenCalled();
  });

  it("cannot reach a guardian with no email — and that is fine", () => {
    expect(channel.canReach(recipient())).toBe(false);
    expect(channel.canReach(recipient({ email: "sita@example.com" }))).toBe(true);
  });

  it("does not email general or positive updates (§32)", () => {
    expect(channel.shouldSendFor("URGENT")).toBe(true);
    expect(channel.shouldSendFor("IMPORTANT")).toBe(true);
    expect(channel.shouldSendFor("GENERAL")).toBe(false);
    expect(channel.shouldSendFor("POSITIVE")).toBe(false);
  });

  it("reports QUEUED, never SENT — handing to a transport is not delivery (§40)", async () => {
    process.env = { ...original, RESEND_API_KEY: "test-key" };

    const result = await channel.send({
      notice,
      recipients: [recipient({ email: "sita@example.com" })],
      schoolName: "Green Village",
    });

    expect(result.status).toBe("QUEUED");
    expect(result.count).toBe(1);
  });

  it("reports FAILED when every send fails, without throwing", async () => {
    process.env = { ...original, RESEND_API_KEY: "test-key" };
    sendNoticeEmail.mockResolvedValue({ success: false });

    const result = await channel.send({
      notice,
      recipients: [recipient({ email: "sita@example.com" })],
    });

    expect(result.status).toBe("FAILED");
  });
});

describe("offline channel (§38)", () => {
  const channel = new OfflineDeliveryChannel();

  it("applies exactly when nothing digital can reach them", () => {
    expect(
      channel.canReach(recipient({ accessState: "NOT_CREATED", email: null }))
    ).toBe(true);
  });

  it("does NOT apply to an activated guardian", () => {
    expect(channel.canReach(recipient())).toBe(false);
  });

  it("does NOT apply when an email exists", () => {
    expect(
      channel.canReach(
        recipient({ accessState: "NOT_CREATED", email: "a@b.com" })
      )
    ).toBe(false);
  });

  it("queues offline guardians for follow-up", async () => {
    const result = await channel.send({
      recipients: [recipient({ accessState: "NOT_CREATED" })],
    });
    expect(result.status).toBe("QUEUED");
    expect(result.count).toBe(1);
  });
});

describe("SMS adapter is inert (§33, §61)", () => {
  const channel = new SmsNotificationChannel();

  it("is never configured", () => {
    expect(channel.isConfigured()).toBe(false);
  });

  it("never sends anything", async () => {
    const result = await channel.send({
      notice,
      recipients: [recipient({ phone: "9800000000" })],
    });
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.reason).toMatch(/not configured/i);
  });

  it("still models reachability, so the UI can say 'phone available'", () => {
    expect(channel.canReach(recipient({ phone: "9800000000" }))).toBe(true);
    expect(channel.canReach(recipient())).toBe(false);
  });
});

describe("reachability description (§36)", () => {
  it("calls an activated guardian CONNECTED even with no email or phone", () => {
    const result = describeReachability(
      { accessState: "ACTIVATED" },
      { canReceiveNotices: true }
    );
    // The rule the spec is emphatic about.
    expect(result.key).toBe("CONNECTED");
    expect(result.label).toMatch(/connected/i);
  });

  it("falls back to email, then phone, then offline", () => {
    expect(
      describeReachability(
        { accessState: "NOT_CREATED", email: "a@b.com" },
        { canReceiveNotices: true }
      ).key
    ).toBe("EMAIL");

    expect(
      describeReachability(
        { accessState: "NOT_CREATED", phone: "98000" },
        { canReceiveNotices: true }
      ).key
    ).toBe("PHONE");

    expect(
      describeReachability(
        { accessState: "NOT_CREATED" },
        { canReceiveNotices: true }
      ).key
    ).toBe("OFFLINE");
  });

  it("reports guardians the school excluded from notices separately", () => {
    expect(
      describeReachability(
        { accessState: "ACTIVATED" },
        { canReceiveNotices: false }
      ).key
    ).toBe("NO_NOTICES");
  });
});
