import { publishRealtimeEvent } from "@/lib/realtimeBus";

export const WORK_INDICATORS_CHANNEL = "work-indicators";

export function publishWorkIndicatorsUpdate(reason, payload = {}) {
  publishRealtimeEvent(WORK_INDICATORS_CHANNEL, {
    kind: "work-indicators-updated",
    reason,
    ...payload,
  });
}
