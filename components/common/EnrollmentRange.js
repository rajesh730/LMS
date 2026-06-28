"use client";

import AppDate from "@/components/common/AppDate";

// "When did they study here" range, in the viewer's chosen calendar. Used inside
// server components (it's a client island via AppDate).
export default function EnrollmentRange({ entry, className = "" }) {
  const { status, startedAt, endedAt } = entry || {};

  let body = null;
  if (status === "CURRENT") {
    body = startedAt ? (
      <>
        Since <AppDate value={startedAt} mode="monthYear" /> · Present
      </>
    ) : (
      "Present"
    );
  } else if (startedAt && endedAt) {
    body = (
      <>
        <AppDate value={startedAt} mode="monthYear" /> –{" "}
        <AppDate value={endedAt} mode="monthYear" />
      </>
    );
  } else if (startedAt) {
    body = (
      <>
        From <AppDate value={startedAt} mode="monthYear" />
      </>
    );
  } else if (endedAt) {
    body = (
      <>
        Until <AppDate value={endedAt} mode="monthYear" />
      </>
    );
  }

  if (!body) return null;
  return <span className={className}>{body}</span>;
}
