"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import EventParticipationForm from "./EventParticipationForm";
import { getEventStage, getStageClasses, isDatePast } from "@/lib/eventUiStatus";

const FILTERS = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "DISAPPROVED", label: "Disapproved" },
  { id: "ALL", label: "All" },
];

const STATUS_STYLES = {
  PENDING: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  DISAPPROVED: "bg-rose-500/15 text-rose-200 border-rose-500/30",
};

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPartnerName(event) {
  const primaryPartner = event?.partners?.find((partner) => partner.isPrimary);
  const partner = primaryPartner || event?.partners?.[0];
  return (
    partner?.organizer?.organizationName ||
    partner?.displayName ||
    "Platform event"
  );
}

function isRegistrationClosed(event) {
  if (!event) return true;
  if (event.date && isDatePast(event.date, { endOfDay: true })) return true;
  if (
    event.registrationDeadline &&
    isDatePast(event.registrationDeadline, { endOfDay: true })
  ) {
    return true;
  }
  return false;
}

export default function SchoolEventInvitations({ refreshKey = 0, onChanged }) {
  const [invitations, setInvitations] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [message, setMessage] = useState("");
  const [participationEvent, setParticipationEvent] = useState(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/event-invitations", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load event invitations");
      }

      const data = await res.json();
      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
    } catch (error) {
      console.error("Failed to load event invitations", error);
      setMessage("Could not load platform event notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations, refreshKey]);

  const counts = useMemo(
    () =>
      invitations
        .filter((invitation) => {
          const lifecycle = String(
            invitation.event?.lifecycleStatus || "ACTIVE"
          ).toUpperCase();
          return !["COMPLETED", "ARCHIVED"].includes(lifecycle);
        })
        .reduce(
        (acc, invitation) => {
          acc.ALL += 1;
          if (acc[invitation.status] !== undefined) {
            acc[invitation.status] += 1;
          }
          return acc;
        },
        { ALL: 0, PENDING: 0, APPROVED: 0, DISAPPROVED: 0 }
      ),
    [invitations]
  );

  const visibleInvitations = invitations.filter((invitation) => {
    const lifecycle = String(
      invitation.event?.lifecycleStatus || "ACTIVE"
    ).toUpperCase();
    if (["COMPLETED", "ARCHIVED"].includes(lifecycle)) {
      return false;
    }
    if (filter === "ALL") return true;
    return invitation.status === filter;
  });

  const updateInvitation = async (invitation, action) => {
    try {
      if (
        action === "disapprove" &&
        invitation.status === "APPROVED" &&
        !confirm(
          "Disapprove this event for your school? If you already registered a team and registration is still open, this will withdraw that team."
        )
      ) {
        return;
      }

      setActioningId(invitation._id);
      setMessage("");

      const res = await fetch(
        `/api/events/${invitation.event?._id}/school-invitation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update invitation");
      }

      setMessage(data.message);
      await fetchInvitations();
      onChanged?.();
    } catch (error) {
      console.error("Failed to update invitation", error);
      setMessage(error.message || "Failed to update invitation");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
              <FaBell />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Platform Event Notifications
              </h2>
              <p className="text-sm text-slate-400">
                Approve partner or platform events before your students can see
                or join them.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {counts.PENDING} waiting for school decision
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === item.id
                ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-6 text-center text-slate-400">
            Loading platform event notifications...
          </div>
        ) : visibleInvitations.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-6 text-center text-slate-400">
            <p className="font-semibold text-slate-300">
              No {filter.toLowerCase()} platform invitations right now.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Platform events sent to your school will appear here for approval before students can join.
            </p>
          </div>
        ) : (
          visibleInvitations.map((invitation) => {
            const event = invitation.event;
            if (!event) return null;
            const participation = invitation.participation || {};
            const hasParticipation = Boolean(participation.hasParticipation);
            const stage = getEventStage(event, {
              invitationStatus: invitation.status,
              participationStatus: hasParticipation ? "APPROVED" : undefined,
            });

            return (
              <article
                key={invitation._id}
                className="rounded-xl border border-slate-700 bg-slate-800/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          STATUS_STYLES[invitation.status]
                        }`}
                      >
                        {invitation.status}
                      </span>
                      <span className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">
                        {event.eventType || "EVENT"}
                      </span>
                      {event.partnerBrandingEnabled && (
                        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                          Partner: {getPartnerName(event)}
                        </span>
                      )}
                      {hasParticipation && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          Team registered:{" "}
                          {participation.registeredStudentCount || 0} students
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white">
                      {event.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {event.description}
                    </p>

                    <div
                      className={`mt-4 rounded-xl border px-3 py-2 text-sm ${getStageClasses(
                        stage.tone
                      )}`}
                    >
                      <div className="font-semibold">{stage.label}</div>
                      <div className="text-xs opacity-90">
                        {stage.nextAction}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span className="flex items-center gap-2">
                        <FaCalendarAlt className="text-slate-500" />
                        Event: {formatDate(event.date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <FaUsers className="text-slate-500" />
                        Grades:{" "}
                        {event.eligibleGrades?.length
                          ? event.eligibleGrades.join(", ")
                          : "All grades"}
                      </span>
                      <span>
                        Deadline: {formatDate(event.registrationDeadline)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {invitation.status === "APPROVED" && (
                      <button
                        disabled={isRegistrationClosed(event)}
                        onClick={() => setParticipationEvent(event)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        <FaUsers />
                        {isRegistrationClosed(event)
                          ? "Registration Closed"
                          : hasParticipation
                          ? "Manage Team"
                          : "Take Part"}
                      </button>
                    )}
                    {invitation.status !== "APPROVED" && (
                      <button
                        disabled={actioningId === invitation._id}
                        onClick={() => updateInvitation(invitation, "approve")}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaCheckCircle />
                        Approve
                      </button>
                    )}
                    {invitation.status !== "DISAPPROVED" && (
                      <button
                        disabled={actioningId === invitation._id}
                        onClick={() =>
                          updateInvitation(invitation, "disapprove")
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaTimesCircle />
                        Disapprove
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {participationEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {invitations.find(
                    (invitation) =>
                      invitation.event?._id === participationEvent._id
                  )?.participation?.hasParticipation
                    ? "Manage Team"
                    : "Take Part"}
                  : {participationEvent.title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Only eligible students for{" "}
                  {participationEvent.eligibleGrades?.length
                    ? participationEvent.eligibleGrades.join(", ")
                    : "all grades"}{" "}
                  will be shown.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setParticipationEvent(null)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                Close
              </button>
            </div>

            <EventParticipationForm
              event={participationEvent}
              isEditing
              onSuccess={async () => {
                setParticipationEvent(null);
                await fetchInvitations();
                onChanged?.();
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
