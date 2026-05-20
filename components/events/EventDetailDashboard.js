"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import EventInfoHeader from "./EventInfoHeader";
import ManagementTabs from "./ManagementTabs";
import { useSession } from "next-auth/react";
import { FaArrowLeft } from "react-icons/fa";
import LoadingState from "@/components/ui/LoadingState";

export default function EventDetailDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id;
  const { data: session } = useSession();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview"
  );
  const [loadError, setLoadError] = useState("");

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#071833] to-[#0a2145] p-8 flex items-center justify-center">
        <LoadingState
          title="Loading event details"
          message="Preparing overview, participants, notices, rounds, and certificates."
        />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#071833] to-[#0a2145] p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#ffb21c]/30 bg-[#ffb21c]/10 p-6 text-center">
          <h1 className="text-xl font-bold text-white">Event could not load</h1>
          <p className="mt-2 text-[#fff0c9]">
            {loadError || "Event not found or you do not have access."}
          </p>
          <button
            type="button"
            onClick={fetchEventData}
            className="mt-4 rounded-lg bg-[#ffb21c] px-4 py-2 text-sm font-semibold text-[#0a2f66] hover:bg-[#ffc44d]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { event, requests, capacityInfo, perSchoolBreakdown } = eventData;
  const backHref =
    session?.user?.role === "SUPER_ADMIN"
      ? "/admin/dashboard?tab=events"
      : "/school/dashboard?tab=school-events";
  const backLabel =
    session?.user?.role === "SUPER_ADMIN"
      ? "Back to Dashboard"
      : "Back to Dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071833] to-[#0a2145]">
      {/* Header */}
      <EventInfoHeader event={event} capacityInfo={capacityInfo} />

      {/* Main Content */}
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1c4a8d] bg-[#081b39]/70 px-4 py-2 text-sm font-semibold text-[#dce9ff] hover:bg-[#0f2953]"
          >
            <FaArrowLeft />
            {backLabel}
          </Link>
        </div>
        {/* Management Tabs */}
        <ManagementTabs
          requests={requests}
          capacityInfo={capacityInfo}
          perSchoolBreakdown={perSchoolBreakdown}
          event={event}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onDataChange={fetchEventData}
        />
      </div>
    </div>
  );
}
