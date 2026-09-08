jest.mock("@/lib/parentAccess", () => ({
  requireParentSession: jest.fn(),
}));
jest.mock("@/lib/webPush", () => ({
  getWebPushPublicConfig: jest.fn(),
}));
jest.mock("@/models/PushSubscription", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

import { requireParentSession } from "@/lib/parentAccess";
import { getWebPushPublicConfig } from "@/lib/webPush";
import PushSubscription from "@/models/PushSubscription";
import {
  GET,
  POST,
  DELETE,
} from "@/app/api/parent/push-subscription/route";

const PARENT_ID = "aaaaaaaaaaaaaaaaaaaaaaa1";
const ENDPOINT = "https://push.example.test/subscription-1";

function session(deviceMode = "PERSONAL") {
  requireParentSession.mockResolvedValue({
    session: { user: { deviceMode } },
    parent: { _id: PARENT_ID, authVersion: 7 },
  });
}

function request(method, body) {
  return new Request("http://localhost/api/parent/push-subscription", {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Jest browser",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  session();
  getWebPushPublicConfig.mockReturnValue({
    enabled: true,
    publicKey: "public-vapid-key",
  });
  PushSubscription.countDocuments.mockResolvedValue(2);
  PushSubscription.findOneAndUpdate.mockResolvedValue({});
  PushSubscription.deleteOne.mockResolvedValue({ deletedCount: 1 });
});

it("reports every current device for this credential generation", async () => {
  const response = await GET();
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(PushSubscription.countDocuments).toHaveBeenCalledWith({
    parent: PARENT_ID,
    authVersion: 7,
  });
  expect(json.data.subscriptionCount).toBe(2);
  expect(json.data.allowedOnDevice).toBe(true);
});

it("upserts this browser endpoint and binds it to the current parent", async () => {
  const response = await POST(
    request("POST", {
      endpoint: ENDPOINT,
      expirationTime: Date.now() + 60_000,
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    })
  );

  expect(response.status).toBe(200);
  expect(PushSubscription.findOneAndUpdate).toHaveBeenCalledWith(
    { endpoint: ENDPOINT },
    {
      $set: expect.objectContaining({
        parent: PARENT_ID,
        authVersion: 7,
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    },
    { upsert: true, new: true, runValidators: true }
  );
});

it("blocks push registration on a shared phone", async () => {
  session("SHARED");

  const response = await POST(
    request("POST", {
      endpoint: ENDPOINT,
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    })
  );

  expect(response.status).toBe(400);
  expect(PushSubscription.findOneAndUpdate).not.toHaveBeenCalled();
});

it("removes only this parent's selected device", async () => {
  const response = await DELETE(request("DELETE", { endpoint: ENDPOINT }));

  expect(response.status).toBe(200);
  expect(PushSubscription.deleteOne).toHaveBeenCalledWith({
    parent: PARENT_ID,
    endpoint: ENDPOINT,
  });
});
