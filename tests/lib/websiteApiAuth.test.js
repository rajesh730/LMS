jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/rateLimit", () => ({
  applyRateLimit: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock("@/models/SchoolWebsiteApiKey", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({}),
  },
}));

import SchoolWebsiteApiKey from "@/models/SchoolWebsiteApiKey";
import {
  createWebsiteApiKey,
  hashWebsiteApiKey,
  requireWebsiteApiKey,
} from "@/lib/websiteApiAuth";

function requestWith(key = "") {
  return new Request("https://pravyo.test/api/v1/website/school", {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
}

describe("website API key authentication", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a random key and stores a one-way hash", () => {
    const first = createWebsiteApiKey();
    const second = createWebsiteApiKey();
    expect(first.rawKey).toMatch(/^prv_school_live_[A-Za-z0-9_-]{43}$/);
    expect(first.rawKey).not.toBe(second.rawKey);
    expect(first.keyHash).toBe(hashWebsiteApiKey(first.rawKey));
    expect(first.keyHash).not.toContain(first.rawKey);
  });

  it("requires a bearer key", async () => {
    const result = await requireWebsiteApiKey(requestWith());
    expect(result.error.status).toBe(401);
    expect(SchoolWebsiteApiKey.findOne).not.toHaveBeenCalled();
  });

  it("derives the school from a valid key", async () => {
    const generated = createWebsiteApiKey();
    SchoolWebsiteApiKey.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: "key-1",
        school: "school-1",
      }),
    });

    const result = await requireWebsiteApiKey(requestWith(generated.rawKey));
    expect(result.schoolId).toBe("school-1");
    expect(SchoolWebsiteApiKey.findOne).toHaveBeenCalledWith({
      keyHash: hashWebsiteApiKey(generated.rawKey),
      revokedAt: null,
    });
  });

  it("rejects an unknown or revoked key without revealing which", async () => {
    const generated = createWebsiteApiKey();
    SchoolWebsiteApiKey.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    const result = await requireWebsiteApiKey(requestWith(generated.rawKey));
    expect(result.error.status).toBe(401);
  });
});
