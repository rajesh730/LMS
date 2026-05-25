jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/db", () => jest.fn());

jest.mock("@/models/PlatformChallengeSubmission", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock("@/models/PublicFeedReaction", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock("@/lib/publicFeedViewer", () => ({
  PUBLIC_FEED_VIEWER_COOKIE: "public-feed-viewer",
  createPublicFeedViewerId: jest.fn(() => "viewer-1"),
  buildPublicFeedViewerCookieOptions: jest.fn(() => ({
    httpOnly: true,
    path: "/",
  })),
}));

jest.mock("@/lib/realtimeBus", () => ({
  publishRealtimeEvent: jest.fn(),
}));

import { cookies } from "next/headers";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import PublicFeedReaction from "@/models/PublicFeedReaction";
import {
  createPublicFeedViewerId,
  buildPublicFeedViewerCookieOptions,
} from "@/lib/publicFeedViewer";
import { publishRealtimeEvent } from "@/lib/realtimeBus";
import { POST } from "@/app/api/public/feed/[id]/like/route";

function createLeanQuery(result) {
  return {
    select() {
      return {
        lean: async () => result,
      };
    },
  };
}

describe("POST /api/public/feed/[id]/like", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects non-pulse feed items", async () => {
    const response = await POST(null, { params: { id: "event-123" } });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Only pulse posts can be liked.",
    });
  });

  it("creates a like, sets a viewer cookie, and publishes realtime updates", async () => {
    cookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    });
    PlatformChallengeSubmission.findOne.mockReturnValue(
      createLeanQuery({ _id: "submission-1" })
    );
    PublicFeedReaction.findOne.mockReturnValue(createLeanQuery(null));
    PublicFeedReaction.create.mockResolvedValue({ _id: "reaction-1" });
    PublicFeedReaction.countDocuments.mockResolvedValue(5);

    const response = await POST(null, { params: { id: "pulse-submission-1" } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      liked: true,
      reactionCount: 5,
    });
    expect(createPublicFeedViewerId).toHaveBeenCalledTimes(1);
    expect(buildPublicFeedViewerCookieOptions).toHaveBeenCalledTimes(1);
    expect(PublicFeedReaction.create).toHaveBeenCalledWith({
      submission: "submission-1",
      actorKey: "viewer-1",
    });
    expect(publishRealtimeEvent).toHaveBeenCalledWith("public-feed", {
      kind: "like-updated",
      itemId: "pulse-submission-1",
      reactionCount: 5,
    });
    expect(response.cookies.get("public-feed-viewer")).toBeTruthy();
  });

  it("removes an existing like for the same viewer", async () => {
    cookies.mockResolvedValue({
      get: jest.fn(() => ({ value: "viewer-existing" })),
    });
    PlatformChallengeSubmission.findOne.mockReturnValue(
      createLeanQuery({ _id: "submission-1" })
    );
    PublicFeedReaction.findOne.mockReturnValue(
      createLeanQuery({ _id: "reaction-1" })
    );
    PublicFeedReaction.deleteOne.mockResolvedValue({ acknowledged: true });
    PublicFeedReaction.countDocuments.mockResolvedValue(2);

    const response = await POST(null, { params: { id: "pulse-submission-1" } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      liked: false,
      reactionCount: 2,
    });
    expect(PublicFeedReaction.deleteOne).toHaveBeenCalledWith({
      _id: "reaction-1",
    });
    expect(PublicFeedReaction.create).not.toHaveBeenCalled();
  });
});
