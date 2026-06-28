jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
jest.mock("@/lib/db", () => jest.fn());
jest.mock("@/models/Event", () => ({
  __esModule: true,
  default: { findById: jest.fn(), findByIdAndDelete: jest.fn() },
}));
jest.mock("@/lib/eventInvitations", () => ({
  syncEventSchoolInvitations: jest.fn(),
}));
jest.mock("@/lib/eventRealtime", () => ({
  publishEventRealtimeUpdate: jest.fn(),
}));

import { getServerSession } from "next-auth";
import Event from "@/models/Event";
import { PUT } from "@/app/api/events/[id]/route";

const EVENT_ID = "507f1f77bcf86cd799439012";

function updateEvent() {
  return PUT(
    new Request(`http://localhost/api/events/${EVENT_ID}`, {
      method: "PUT",
      body: JSON.stringify({ title: "Unauthorized change" }),
    }),
    { params: Promise.resolve({ id: EVENT_ID }) }
  );
}

describe("event management ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks a school admin from editing another school's event", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "school-a", role: "SCHOOL_ADMIN" },
    });
    const event = {
      _id: EVENT_ID,
      eventScope: "SCHOOL",
      school: "school-b",
      save: jest.fn(),
    };
    Event.findById.mockResolvedValue(event);

    const res = await updateEvent();

    expect(res.status).toBe(403);
    expect(event.save).not.toHaveBeenCalled();
  });

  it("blocks an unassigned teacher from editing a same-school event", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "teacher-1", schoolId: "school-a", role: "TEACHER" },
    });
    const event = {
      _id: EVENT_ID,
      eventScope: "SCHOOL",
      school: "school-a",
      createdBy: "teacher-2",
      assignedMentors: [],
      save: jest.fn(),
    };
    Event.findById.mockResolvedValue(event);

    const res = await updateEvent();

    expect(res.status).toBe(403);
    expect(event.save).not.toHaveBeenCalled();
  });

  it("rejects students before loading the target event", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "student-1", role: "STUDENT" },
    });

    const res = await updateEvent();

    expect(res.status).toBe(403);
    expect(Event.findById).not.toHaveBeenCalled();
  });
});
