jest.mock("@/lib/db", () => jest.fn(() => Promise.resolve()));
jest.mock("@/lib/authz", () => ({ requireApiSession: jest.fn() }));

import connectDB from "@/lib/db";
import { requireApiSession } from "@/lib/authz";
import { defineRoute } from "@/lib/routeHandler";
import { APIError, successResponse, errorResponse } from "@/lib/apiResponse";

const session = { user: { id: "u1", role: "SCHOOL_ADMIN" } };

function req(method = "GET") {
  return { method, url: "http://localhost/api/thing" };
}

beforeEach(() => {
  jest.clearAllMocks();
  requireApiSession.mockResolvedValue({ session });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => console.error.mockRestore());

describe("defineRoute — auth", () => {
  it("passes the resolved session to the handler", async () => {
    const route = defineRoute({ roles: ["SCHOOL_ADMIN"] }, async (ctx) =>
      successResponse(200, "ok", { id: ctx.session.user.id })
    );

    const res = await route(req(), {});
    expect(requireApiSession).toHaveBeenCalledWith(["SCHOOL_ADMIN"]);
    await expect(res.json()).resolves.toMatchObject({ data: { id: "u1" } });
  });

  it("short-circuits with the gate's own response when auth fails", async () => {
    requireApiSession.mockResolvedValue({
      error: errorResponse(403, "Forbidden", "FORBIDDEN"),
    });
    const handler = jest.fn();
    const route = defineRoute({ roles: ["TEACHER"] }, handler);

    const res = await route(req(), {});
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not hit the database for an unauthenticated caller", async () => {
    requireApiSession.mockResolvedValue({
      error: errorResponse(401, "Authentication required", "UNAUTHORIZED"),
    });

    await defineRoute({ roles: [] }, async () => successResponse(200))(req(), {});
    expect(connectDB).not.toHaveBeenCalled();
  });

  it("skips the session entirely for a public route", async () => {
    const route = defineRoute({ roles: null }, async (ctx) =>
      successResponse(200, "ok", { session: ctx.session })
    );

    await route(req(), {});
    expect(requireApiSession).not.toHaveBeenCalled();
  });
});

describe("defineRoute — plumbing", () => {
  it("connects before running the handler", async () => {
    await defineRoute({ roles: [] }, async () => successResponse(200))(req(), {});
    expect(connectDB).toHaveBeenCalledTimes(1);
  });

  it("can skip connecting for a route that touches no model", async () => {
    await defineRoute({ roles: [], connect: false }, async () =>
      successResponse(200)
    )(req(), {});
    expect(connectDB).not.toHaveBeenCalled();
  });

  it("awaits Next 16 async params for the handler", async () => {
    const route = defineRoute({ roles: [] }, async ({ params }) =>
      successResponse(200, "ok", { id: params.id })
    );

    const res = await route(req(), { params: Promise.resolve({ id: "e1" }) });
    await expect(res.json()).resolves.toMatchObject({ data: { id: "e1" } });
  });

  it("gives the handler empty params when the route has none", async () => {
    const route = defineRoute({ roles: [] }, async ({ params }) =>
      successResponse(200, "ok", { keys: Object.keys(params) })
    );

    const res = await route(req(), {});
    await expect(res.json()).resolves.toMatchObject({ data: { keys: [] } });
  });
});

describe("defineRoute — errors", () => {
  it("maps a thrown APIError to its own status and code", async () => {
    const route = defineRoute({ roles: [] }, async () => {
      throw new APIError("Notice not found", 404, "NOT_FOUND");
    });

    const res = await route(req(), {});
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      message: "Notice not found",
      code: "NOT_FOUND",
    });
  });

  it("turns an unexpected throw into a 500 without leaking the message", async () => {
    const route = defineRoute({ roles: [] }, async () => {
      throw new Error("connection string is postgres://user:hunter2@host");
    });

    const res = await route(req(), {});
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });

  it("logs the failing method and url once", async () => {
    const route = defineRoute({ roles: [] }, async () => {
      throw new Error("boom");
    });

    await route(req("POST"), {});
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toContain("POST");
  });

  it("catches a rejected promise from the handler too", async () => {
    const route = defineRoute({ roles: [] }, () => Promise.reject(new Error("async boom")));
    const res = await route(req(), {});
    expect(res.status).toBe(500);
  });
});
