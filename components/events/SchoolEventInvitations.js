"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaSearch,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import EventParticipationForm from "./EventParticipationForm";
import { getEventStage, getStageClasses, isDatePast } from "@/lib/eventUiStatus";
import PaginationControls from "@/components/PaginationControls";
import LifecycleTimeline from "@/components/ui/LifecycleTimeline";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const FILTERS = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "DISAPPROVED", label: "Disapproved" },
  { id: "ALL", label: "All" },
];

const STATUS_STYLES = {
  PENDING: "bg-[#fff7e6] text-[#7a4d00] border-[#f4d28a]",
  APPROVED: "bg-[#e8f8ef] text-[#17643a] border-[#9ed8b5]",
  DISAPPROVED: "bg-rose-50 text-rose-800 border-rose-200",
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

function isTeamEventLike(event) {
  return String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
}

export default function SchoolEventInvitations({ refreshKey = 0, onChanged }) {
  const [invitations, setInvitations] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [message, setMessage] = useState("");
  const [participationEvent, setParticipationEvent] = useState(null);
  const [openNoticeInvitationId, setOpenNoticeInvitationId] = useState(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({
    ALL: 0,
    PENDING: 0,
    APPROVED: 0,
    DISAPPROVED: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });
  const [confirmInvitation, setConfirmInvitation] = useState(null);

  const fetchInvitations = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filter,
        page: String(page),
        limit: "10",
      });
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/school/event-invitations?${params}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load event invitations");
      }

      const data = await res.json();
      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
      if (data.counts) {
        setCounts(data.counts);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to load event invitations", error);
      setMessage("Could not load platform event notifications.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvitations(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchInvitations, refreshKey]);

  const updateInvitation = async (invitation, action, options = {}) => {
    try {
      if (
        !options.skipConfirm &&
        action === "disapprove" &&
        invitation.status === "APPROVED"
      ) {
        setConfirmInvitation({ invitation, action });
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
      await fetchInvitations(pagination.page || 1);
      onChanged?.();
    } catch (error) {
      console.error("Failed to update invitation", error);
      setMessage(error.message || "Failed to update invitation");
    } finally {
      setActioningId(null);
      setConfirmInvitation(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_14px_36px_rgba(10,47,102,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#eaf2ff] p-3 text-[#0a2f66]">
              <FaBell />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#17120a]">
                Platform Event Notifications
              </h2>
              <p className="text-sm text-[#344f77]">
                Approve partner or platform events before your students can see
                or join them.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#bfd7f7] bg-[#eaf2ff] px-4 py-3 text-sm font-semibold text-[#0a2f66]">
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
                ? "bg-[#0a2f66] text-white"
                : "border border-[#d7cdbb] bg-white text-[#0a2f66] hover:bg-[#eaf2ff]"
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-xl">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52657d]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search platform event invitations..."
            className="w-full rounded-xl border border-[#d7cdbb] bg-[#f8fbff] py-3 pl-10 pr-4 text-[#17120a] outline-none transition focus:border-[#2f7fdb]"
          />
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-[#bfd7f7] bg-[#eaf2ff] px-4 py-3 text-sm text-[#0a2f66]">
          {message}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-6 text-center text-[#52657d]">
            Loading platform event notifications...
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-6 text-center text-[#52657d]">
            <p className="font-semibold text-[#17120a]">
              No {filter.toLowerCase()} platform invitations right now.
            </p>
            <p className="mt-1 text-sm text-[#52657d]">
              Platform events sent to your school will appear here for approval before students can join.
            </p>
          </div>
        ) : (
          invitations.map((invitation) => {
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
                className="rounded-xl border border-[#d7cdbb] bg-white p-5 shadow-[0_10px_26px_rgba(10,47,102,0.05)]"
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
                      <span className="rounded-full border border-[#d7cdbb] px-3 py-1 text-xs font-semibold text-[#0a2f66]">
                        {event.eventType || "EVENT"}
                      </span>
                      {event.partnerBrandingEnabled && (
                        <span className="rounded-full border border-[#bdefff] bg-[#e8fbff] px-3 py-1 text-xs font-semibold text-[#07576b]">
                          Partner: {getPartnerName(event)}
                        </span>
                      )}
                      {hasParticipation && (
                        <span className="rounded-full border border-[#9ed8b5] bg-[#e8f8ef] px-3 py-1 text-xs font-semibold text-[#17643a]">
                          Team registered:{" "}
                          {participation.registeredStudentCount || 0} students
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-[#17120a]">
                      {event.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-[#344f77]">
                      {event.description}
                    </p>

                    {invitation.latestEventNotice && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenNoticeInvitationId((current) =>
                              current === invitation._id ? null : invitation._id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-[#bdefff] bg-[#e8fbff] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#07576b] transition hover:bg-[#d8f6ff]"
                        >
                          <FaBell />
                          {invitation.eventNoticeCount > 1
                            ? `${invitation.eventNoticeCount} Notices`
                            : "1 Notice"}
                        </button>
                        {openNoticeInvitationId === invitation._id && (
                          <div className="mt-3 rounded-xl border border-[#bdefff] bg-[#e8fbff] px-4 py-3">
                            <p className="text-sm font-semibold text-[#17120a]">
                              {invitation.latestEventNotice.title}
                            </p>
                            <p className="mt-1 line-clamp-3 text-sm text-[#344f77]">
                              {invitation.latestEventNotice.message}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#52657d]">
                              {invitation.eventNoticeCount > 1 && (
                                <span>
                                  {invitation.eventNoticeCount - 1} older notice
                                  {invitation.eventNoticeCount - 1 === 1 ? "" : "s"} available
                                </span>
                              )}
                              <Link
                                href={`/events/${event._id}`}
                                className="font-semibold text-[#0a2f66] underline underline-offset-2 hover:text-[#123f7d]"
                              >
                                View all notices
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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

                    <div className="mt-4">
                      <LifecycleTimeline
                        compact
                        title="School decision history"
                        items={invitation.lifecycle}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#27344a]">
                      <span className="flex items-center gap-2">
                        <FaCalendarAlt className="text-[#52657d]" />
                        Event: {formatDate(event.date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <FaUsers className="text-[#52657d]" />
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
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 font-semibold text-white transition hover:bg-[#123f7d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#52657d]"
                      >
                        <FaUsers />
                        {isRegistrationClosed(event)
                          ? "Registration Closed"
                          : hasParticipation
                          ? (isTeamEventLike(event) ? "Manage Groups" : "Manage Participants")
                          : "Take Part"}
                      </button>
                    )}
                    {invitation.status !== "APPROVED" && (
                      <button
                        disabled={actioningId === invitation._id}
                        onClick={() => updateInvitation(invitation, "approve")}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 font-semibold text-white transition hover:bg-[#123f7d] disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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

      {!loading && invitations.length > 0 && (
        <PaginationControls
          currentPage={pagination.page || pagination.currentPage || 1}
          totalPages={pagination.totalPages || 1}
          onPageChange={fetchInvitations}
          totalItems={pagination.totalItems}
          start={pagination.start}
          end={pagination.end}
        />
      )}

      {participationEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#17120a]">
                  {invitations.find(
                    (invitation) =>
                      invitation.event?._id === participationEvent._id
                  )?.participation?.hasParticipation
                    ? (isTeamEventLike(participationEvent) ? "Manage Groups" : "Manage Participants")
                    : "Take Part"}
                  : {participationEvent.title}
                </h3>
                <p className="mt-1 text-sm text-[#344f77]">
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
                className="rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
              >
                Close
              </button>
            </div>

            <EventParticipationForm
              event={participationEvent}
              isEditing
              onSuccess={async () => {
                setParticipationEvent(null);
                await fetchInvitations(pagination.page || 1);
                onChanged?.();
              }}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmInvitation)}
        title="Disapprove this event?"
        message="If your school already registered students and registration is still open, this will withdraw that registration."
        confirmLabel="Disapprove event"
        tone="danger"
        busy={Boolean(confirmInvitation && actioningId === confirmInvitation.invitation?._id)}
        onClose={() => setConfirmInvitation(null)}
        onConfirm={() => {
          if (confirmInvitation) {
            updateInvitation(
              confirmInvitation.invitation,
              confirmInvitation.action,
              { skipConfirm: true }
            );
          }
        }}
      />
    </section>
  );
}
