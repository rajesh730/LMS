jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/models/Notice", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("@/models/EventNotice", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("@/models/Event", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.mock("@/lib/realtimeBus", () => ({
  getRealtimeHealthSnapshot: jest.fn(() => ({
    provider: "in-memory",
    redisConfigured: false,
    instanceId: "instance-1",
    streamKey: "pravyo:realtime:events",
    pollIntervalMs: 1500,
    startedAt: "2026-05-25T00:00:00.000Z",
    counters: {
      localPublished: 0,
      redisPublishAttempts: 0,
      redisPublishFailures: 0,
      redisPollAttempts: 0,
      redisPollFailures: 0,
      redisEventsReceived: 0,
    },
    lastPublishedAt: null,
    lastErrors: {
      redisPublish: null,
      redisPoll: null,
    },
  })),
  publishRealtimeEvent: jest.fn(),
}));

import { getServerSession } from "next-auth";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import Event from "@/models/Event";
import {
  getRealtimeHealthSnapshot,
  publishRealtimeEvent,
} from "@/lib/realtimeBus";
import { GET } from "@/app/api/admin/diagnostics/route";
import { POST } from "@/app/api/admin/diagnostics/ping/route";

describe("admin diagnostics routes", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 for diagnostics GET when the user is not a super admin", async () => {
    getServerSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Unauthorized",
    });
  });

  it("returns the diagnostics payload shape with realtime health", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "super-1", role: "SUPER_ADMIN" },
    });
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";
    Notice.countDocuments
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    EventNotice.countDocuments.mockResolvedValue(5);
    Event.countDocuments.mockResolvedValue(8);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.database).toEqual({ connected: true });
    expect(body.realtime).toEqual({
      provider: "in-memory",
      redisConfigured: false,
      instanceId: "instance-1",
      streamKey: "pravyo:realtime:events",
      pollIntervalMs: 1500,
      startedAt: "2026-05-25T00:00:00.000Z",
      counters: {
        localPublished: 0,
        redisPublishAttempts: 0,
        redisPublishFailures: 0,
        redisPollAttempts: 0,
        redisPollFailures: 0,
        redisEventsReceived: 0,
      },
      lastPublishedAt: null,
      lastErrors: {
        redisPublish: null,
        redisPoll: null,
      },
    });
    expect(getRealtimeHealthSnapshot).toHaveBeenCalledTimes(1);
    expect(body.notifications).toEqual({
      platformNoticeCount: 3,
      studentNoticeCount: 4,
      eventNoticeCount: 5,
    });
    expect(body.publicEvents).toEqual({
      publicEventCount: 8,
    });
  });

  it("publishes a diagnostics ping for super admins", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "super-1",
        email: "admin@example.com",
        role: "SUPER_ADMIN",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/diagnostics/ping", {
        method: "POST",
        body: JSON.stringify({ channel: "public-feed" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Ping sent");
    expect(body.channel).toBe("public-feed");
    expect(body.payload).toEqual(
      expect.objectContaining({
        kind: "diagnostic-ping",
        channel: "public-feed",
        initiatedBy: "admin@example.com",
      })
    );
    expect(publishRealtimeEvent).toHaveBeenCalledWith(
      "public-feed",
      expect.objectContaining({
        kind: "diagnostic-ping",
        channel: "public-feed",
        initiatedBy: "admin@example.com",
      })
    );
  });

  it("publishes event diagnostics pings only when an event id is supplied", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "super-1",
        email: "admin@example.com",
        role: "SUPER_ADMIN",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/diagnostics/ping", {
        method: "POST",
        body: JSON.stringify({
          channel: "event-notices",
          eventId: "event-123",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        channel: "event-event-123-notices",
      })
    );
    expect(publishRealtimeEvent).toHaveBeenCalledWith(
      "event-event-123-notices",
      expect.objectContaining({
        kind: "diagnostic-ping",
        channel: "event-event-123-notices",
      })
    );
  });

  it("rejects unsupported diagnostics channels", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "super-1", role: "SUPER_ADMIN" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/diagnostics/ping", {
        method: "POST",
        body: JSON.stringify({ channel: "unknown-channel" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Unsupported diagnostics channel",
    });
    expect(publishRealtimeEvent).not.toHaveBeenCalled();
  });
});
