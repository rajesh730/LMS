jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/lib/parentAccess", () => ({
  requireParentChild: jest.fn(),
}));
jest.mock("@/lib/parentNotifications", () => ({
  notifyGuardians: jest.fn().mockResolvedValue({ sent: 0 }),
}));
jest.mock("@/models/Event", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock("@/models/ParticipationRequest", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn() },
}));

import { requireParentChild } from "@/lib/parentAccess";
import { notifyGuardians } from "@/lib/parentNotifications";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import { POST } from "@/app/api/parent/events/[id]/register/route";
import { errorResponse } from "@/lib/apiResponse";

const EVENT_ID = "7777777777777777777777e1";
const AAYUSH = "1111111111111111111111a1";
const SCHOOL = "5555555555555555555555s1";

function context() {
  return { params: Promise.resolve({ id: EVENT_ID }) };
}

function request(body = {}) {
  return new Request(`http://localhost/api/parent/events/${EVENT_ID}/register`, {
    method: "POST",
    body: JSON.stringify({ studentId: AAYUSH, ...body }),
  });
}

function authorised(overrides = {}) {
  requireParentChild.mockResolvedValue({
    parent: { _id: "parent-1", name: "Sita Sharma", phone: "9800000000" },
    student: {
      _id: AAYUSH,
      name: "Aayush Sharma",
      grade: "Grade 8",
      school: SCHOOL,
    },
    permissions: { canRegisterEvents: true },
    context: { studentId: AAYUSH, schoolId: SCHOOL, schoolName: "Green Village" },
    ...overrides,
  });
}

function openEvent(overrides = {}) {
  return {
    _id: EVENT_ID,
    title: "Art Competition",
    date: new Date(Date.now() + 14 * 86400000),
    registrationDeadline: new Date(Date.now() + 7 * 86400000),
    eligibleGrades: [],
    school: SCHOOL,
    participationFormat: "INDIVIDUAL",
    ...overrides,
  };
}

function eventQuery(value) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  ParticipationRequest.findOne.mockReturnValue({
    lean: () => Promise.resolve(null),
  });
  ParticipationRequest.create.mockResolvedValue({ _id: "req-1" });
  ParticipationRequest.updateOne.mockResolvedValue({});
});

describe("parent event registration (§12)", () => {
  it("requires the canRegisterEvents permission", async () => {
    requireParentChild.mockResolvedValue({
      error: errorResponse(403, "Not allowed", "PERMISSION_DENIED"),
    });

    const res = await POST(request(), context());

    expect(res.status).toBe(403);
    expect(requireParentChild).toHaveBeenCalledWith(AAYUSH, "canRegisterEvents");
    expect(ParticipationRequest.create).not.toHaveBeenCalled();
  });

  it("creates a PENDING request — never an enrolment", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(openEvent()));

    const res = await POST(request(), context());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.status).toBe("PENDING");
    // The school still approves; a parent cannot self-enrol past capacity.
    expect(ParticipationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        student: AAYUSH,
        event: EVENT_ID,
        school: SCHOOL,
        status: "PENDING",
      })
    );
  });

  it("is idempotent when the child is already registered", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(openEvent()));
    ParticipationRequest.findOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: "req-1", status: "APPROVED" }),
    });

    const res = await POST(request(), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.alreadyRegistered).toBe(true);
    expect(ParticipationRequest.create).not.toHaveBeenCalled();
  });

  it("reopens a WITHDRAWN request rather than creating a duplicate row", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(openEvent()));
    ParticipationRequest.findOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: "req-1", status: "WITHDRAWN" }),
    });

    const res = await POST(request(), context());

    expect(res.status).toBe(200);
    // A second create would violate the unique (student, event, school) index.
    expect(ParticipationRequest.create).not.toHaveBeenCalled();
    expect(ParticipationRequest.updateOne).toHaveBeenCalledWith(
      { _id: "req-1" },
      expect.objectContaining({ $set: expect.objectContaining({ status: "PENDING" }) })
    );
  });

  it("refuses once the registration deadline has passed", async () => {
    authorised();
    Event.findOne.mockReturnValue(
      eventQuery(
        openEvent({ registrationDeadline: new Date(Date.now() - 86400000) })
      )
    );

    const res = await POST(request(), context());

    expect(res.status).toBe(400);
    expect(ParticipationRequest.create).not.toHaveBeenCalled();
  });

  it("refuses when the child's grade is not eligible", async () => {
    authorised();
    Event.findOne.mockReturnValue(
      eventQuery(openEvent({ eligibleGrades: ["Grade 10"] }))
    );

    const res = await POST(request(), context());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/not in an eligible grade/i);
  });

  it("accepts a messy but equivalent grade value ('8' vs 'Grade 8')", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(openEvent({ eligibleGrades: ["8"] })));

    const res = await POST(request(), context());

    expect(res.status).toBe(201);
  });

  it("sends team events back to the school", async () => {
    authorised();
    Event.findOne.mockReturnValue(
      eventQuery(openEvent({ participationFormat: "TEAM" }))
    );

    const res = await POST(request(), context());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.message).toMatch(/team event/i);
  });

  it("404s for an event outside the child's school", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(null));

    const res = await POST(request(), context());

    expect(res.status).toBe(404);
    // The query is scoped to the verified school, not a request-supplied one.
    expect(Event.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([{ school: SCHOOL }]),
      })
    );
  });

  it("tells the OTHER guardians, excluding the one who acted (§19)", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(openEvent()));

    await POST(request(), context());

    expect(notifyGuardians).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "EVENT",
        studentId: AAYUSH,
        excludeParentId: "parent-1",
      })
    );
    // Never a bare "New notification" (§17).
    const payload = notifyGuardians.mock.calls[0][0];
    expect(payload.title).toContain("Aayush Sharma");
    expect(payload.href).toContain(EVENT_ID);
  });

  it("survives a duplicate-key race without erroring at the parent", async () => {
    authorised();
    Event.findOne.mockReturnValue(eventQuery(openEvent()));
    ParticipationRequest.create.mockRejectedValue({ code: 11000 });

    const res = await POST(request(), context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.alreadyRegistered).toBe(true);
  });
});
