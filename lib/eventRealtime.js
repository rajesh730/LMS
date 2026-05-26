import { publishRealtimeEvent } from "@/lib/realtimeBus";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

export const EVENTS_REALTIME_CHANNEL = "events";

function serializeId(value) {
  return value ? String(value?._id || value) : null;
}

export function publishEventRealtimeUpdate(reason, options = {}) {
  const event = options.event || {};
  const eventId = serializeId(options.eventId || event._id || event.id);
  const schoolId = serializeId(options.schoolId || event.school);
  const payload = {
    kind: "event-updated",
    reason,
    eventId,
    schoolId,
    eventScope: options.eventScope || event.eventScope || null,
    lifecycleStatus: options.lifecycleStatus || event.lifecycleStatus || null,
    status: options.status || event.status || null,
    updatedAt: new Date().toISOString(),
  };

  publishRealtimeEvent(EVENTS_REALTIME_CHANNEL, payload);
  publishRealtimeEvent("student-notifications", payload);
  publishRealtimeEvent("school-notifications", payload);
  publishWorkIndicatorsUpdate(reason, payload);

  if (eventId) {
    publishRealtimeEvent(`event-${eventId}`, payload);
  }
}
