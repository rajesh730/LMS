"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaFileExport,
  FaDownload,
} from "react-icons/fa";
import EventInfoHeader from "./EventInfoHeader";
import ManagementTabs from "./ManagementTabs";
import QuickActionsSection from "./QuickActionsSection";
import { useSession } from "next-auth/react";

export default function EventDetailDashboard() {
  const params = useParams();
  const eventId = params.id;
  const { data: session } = useSession();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/manage`);

      if (res.ok) {
        const data = await res.json();
        setEventData(data);
      } else {
        console.error("Failed to fetch event data");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading event details...</div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="text-white text-center text-xl">Event not found</div>
      </div>
    );
  }

  const { event, requests, capacityInfo, perSchoolBreakdown } = eventData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <EventInfoHeader event={event} capacityInfo={capacityInfo} />

      {/* Main Content */}
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
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

        {/* Quick Actions */}
        <QuickActionsSection event={event} />
      </div>
    </div>
  );
}
