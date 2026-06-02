import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import "@/models/User";

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanText(value, fallback = "") {
  return String(value || fallback).trim();
}

function serializeResult(achievement) {
  return {
    id: `result-${achievement._id}`,
    type: "result",
    date: toIsoDate(achievement.awardedAt || achievement.certificateIssuedAt),
    title: achievement.title,
    placement: cleanText(achievement.placement, "PARTICIPANT").replaceAll(
      "_",
      " "
    ),
    recipientName:
      achievement.certificateRecipientName ||
      achievement.student?.name ||
      "Student",
    schoolName: achievement.school?.schoolName || "School",
    eventTitle: achievement.event?.title || "Published event result",
    certificateUrl: achievement.certificateUrl || "",
  };
}

function serializeEvent(event) {
  return {
    id: `event-${event._id}`,
    type: "event",
    date: toIsoDate(event.date || event.updatedAt),
    title: event.title,
    description: event.description,
    eventScope: event.eventScope === "PLATFORM" ? "Platform" : "School",
    eventType: event.eventType || "Competition",
    eligibleGrades: event.eligibleGrades || [],
    href: `/events/${event._id}`,
  };
}

function getFeedTime(item) {
  return item.date ? new Date(item.date).getTime() : 0;
}

export async function getPublicFeedItems({
  limit = 8,
  cursor = null,
  types = ["result", "event"],
} = {}) {
  await connectDB();

  const pageLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const queryLimit = pageLimit + 1;
  const cursorDate = cursor ? new Date(cursor) : null;
  const hasCursor = cursorDate && !Number.isNaN(cursorDate.getTime());
  const requestedTypes = new Set(Array.isArray(types) ? types : [types]);
  const includeResults = requestedTypes.has("result");
  const includeEvents = requestedTypes.has("event");

  const resultQuery = {
    isPublic: true,
    certificateIssuedAt: { $ne: null },
    ...(hasCursor ? { awardedAt: { $lt: cursorDate } } : {}),
  };
  const eventQuery = {
    status: "APPROVED",
    visibility: "PUBLIC",
    lifecycleStatus: { $ne: "ARCHIVED" },
    ...(hasCursor ? { date: { $lt: cursorDate } } : {}),
  };

  const [achievements, events] = await Promise.all([
    includeResults
      ? Achievement.find(resultQuery)
          .populate("school", "schoolName")
          .populate("student", "name")
          .populate("event", "title")
          .sort({ awardedAt: -1 })
          .limit(queryLimit)
          .lean()
      : [],
    includeEvents
      ? Event.find(eventQuery)
          .select("title description date eventType eventScope eligibleGrades")
          .sort({ date: -1, updatedAt: -1 })
          .limit(queryLimit)
          .lean()
      : [],
  ]);

  const combined = [
    ...achievements.map(serializeResult),
    ...events.map(serializeEvent),
  ].sort((a, b) => getFeedTime(b) - getFeedTime(a));

  const items = combined.slice(0, pageLimit);
  const nextCursor = items.length ? items[items.length - 1].date : null;

  return {
    items,
    nextCursor,
    hasMore: combined.length > pageLimit,
  };
}
