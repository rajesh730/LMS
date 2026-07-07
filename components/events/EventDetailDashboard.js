"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import EventInfoHeader from "./EventInfoHeader";
import ManagementTabs from "./ManagementTabs";
import EventEditorForm from "./EventEditorForm";
import { useSession } from "next-auth/react";
import { FaArrowLeft } from "react-icons/fa";
import LoadingState from "@/components/ui/LoadingState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AlertBanner from "@/components/ui/AlertBanner";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import AuthenticatedPublicLinkGuard from "@/components/AuthenticatedPublicLinkGuard";

export default function EventDetailDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id;
  const { data: session } = useSession();

  const [eventData, setEventData] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview"
  );
  const [loadError, setLoadError] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  const fetchEventData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const res = await fetch(`/api/events/${eventId}/manage`);
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setEventData(data);
      } else {
        setEventData(null);
        setLoadError(data.message || "Failed to load event data.");
      }
    } catch (error) {
      setEventData(null);
      setLoadError(error.message || "Failed to load event data.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await fetch("/api/teachers?limit=200", { cache: "no-store" });
        if (!res.ok) {
          setTeachers([]);
          return;
        }
        const data = await res.json();
        setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      } catch (error) {
        console.error("Failed to load teachers", error);
        setTeachers([]);
      }
    };

    if (session?.user?.role === "SCHOOL_ADMIN") {
      void loadTeachers();
    }
  }, [session?.user?.role]);

  useRealtimeChannel(
    ["events", eventId ? `event-${eventId}` : null].filter(Boolean),
    useCallback(() => {
      void fetchEventData();
    }, [fetchEventData])
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-8">
        <LoadingState
          title="Loading event details"
          message="Preparing overview, participants, results, and certificates."
        />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#d7cdbb] bg-white p-6 text-center shadow-[0_14px_36px_rgba(10,47,102,0.08)]">
          <h1 className="text-xl font-bold text-[#17120a]">Event could not load</h1>
          <p className="mt-2 text-[#344f77]">
            {loadError || "Event not found or you do not have access."}
          </p>
          <button
            type="button"
            onClick={fetchEventData}
             className="event-manage-tab-active mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { event, requests, capacityInfo, perSchoolBreakdown, roundsSummary, certificatesIssued } =
    eventData;
  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      const res = await fetch(`/api/events/${archiveTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to archive event.");
      }
      setFeedback({
        type: "success",
        title: "Event archived",
        message: `${archiveTarget.title} moved to event history.`,
      });
      setArchiveTarget(null);
      await fetchEventData();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Event was not archived",
        message: error.message || "Please retry after checking the connection.",
      });
      setArchiveTarget(null);
    }
  };
  const backHref =
    session?.user?.role === "SUPER_ADMIN"
      ? "/admin/dashboard?tab=events"
      : session?.user?.role === "STUDENT"
      ? "/student/events"
      : "/school/dashboard?tab=school-events";
  const backLabel =
    session?.user?.role === "SUPER_ADMIN"
      ? "Back to Dashboard"
      : "Back to Dashboard";

  return (
    <div className="event-manage-shell min-h-screen bg-[#f5f7fb]">
      <AuthenticatedPublicLinkGuard />
      {/* Header */}
      <EventInfoHeader event={event} capacityInfo={capacityInfo} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <div className="mb-5">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-semibold text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
          >
            <FaArrowLeft />
            {session?.user?.role === "SUPER_ADMIN" ? backLabel : "Back to Events"}
          </Link>
        </div>
        {feedback && (
          <div className="mb-5">
            <AlertBanner
              type={feedback.type}
              title={feedback.title}
              message={feedback.message}
            />
          </div>
        )}
        {/* Management Tabs */}
        <ManagementTabs
          requests={requests}
          capacityInfo={capacityInfo}
          perSchoolBreakdown={perSchoolBreakdown}
          roundsSummary={roundsSummary}
          certificatesIssued={certificatesIssued}
          event={event}
          currentUserRole={session?.user?.role}
          canManagePlatformOperations={session?.user?.role === "SUPER_ADMIN"}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDataChange={fetchEventData}
          onEdit={() => setEditingEvent(event)}
          onArchive={() => setArchiveTarget(event)}
        />
      </div>
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <EventEditorForm
              teachers={teachers}
              ownerMode={
                session?.user?.role === "SUPER_ADMIN" || event.eventScope === "PLATFORM"
                  ? "platform"
                  : "school"
              }
              showFeaturedOnLanding={session?.user?.role === "SUPER_ADMIN"}
              initialData={editingEvent}
              onEventCreated={async () => {
                setEditingEvent(null);
                await fetchEventData();
              }}
              onCancel={() => setEditingEvent(null)}
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this event?"
        message={
          archiveTarget
            ? `${archiveTarget.title} will move to event history. You can restore it later from archived events.`
            : ""
        }
        confirmLabel="Archive event"
        tone="danger"
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </div>
  );
}
