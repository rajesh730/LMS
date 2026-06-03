"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdminPartnerWorkspace from "@/components/partners/AdminPartnerWorkspace";
import CredentialsModal from "@/components/CredentialsModal";
import NoticeManager from "@/components/NoticeManager";
import SchoolPromotionManager from "@/components/admin/SchoolPromotionManager";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";
import SendEventForm from "./SendEventForm";
import EventCard from "./EventCard";

// Lazy load the participants view component
const EventParticipantsView = dynamic(() => import("./EventParticipantsView"), {
  loading: () => (
    <LoadingState
      title="Loading participants"
      message="Preparing registrations and approval details."
    />
  ),
});

import {
  FaSchool,
  FaCalendarAlt,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaKey,
  FaLayerGroup,
  FaSearch,
} from "react-icons/fa";

const FETCH_TIMEOUT_MS = 10000;

function parseSchoolLocation(location = "") {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const postalIndex = parts.findIndex((part) => /^postal code/i.test(part));
  const cleanParts = postalIndex >= 0 ? parts.slice(0, postalIndex) : parts;

  return {
    province: cleanParts.at(-1) || "",
    district: cleanParts.at(-2) || "",
  };
}

function getSchoolProvince(school) {
  return school.province || parseSchoolLocation(school.schoolLocation).province;
}

function getSchoolDistrict(school) {
  return school.district || parseSchoolLocation(school.schoolLocation).district;
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`${url} failed with ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchNamedResource(label, url) {
  try {
    const data = await fetchJsonWithTimeout(url);
    return { ok: true, label, data };
  } catch (error) {
    return {
      ok: false,
      label,
      error: error?.name === "AbortError"
        ? `${label} timed out after ${FETCH_TIMEOUT_MS / 1000}s`
        : error?.message || `Failed to load ${label}`,
    };
  }
}

function AdminDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "approvals";
  const activeTab = ["judging", "results"].includes(rawTab) ? "events" : rawTab;
  const [schools, setSchools] = useState([]);
  const [events, setEvents] = useState([]);
  const [partners, setPartners] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolProvince, setSchoolProvince] = useState("All Provinces");
  const [schoolDistrict, setSchoolDistrict] = useState("All Districts");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [viewingEvent, setViewingEvent] = useState(null);
  const [eventWorkspaceTab, setEventWorkspaceTab] = useState("manage");
  const [deletingId, setDeletingId] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  const closeOverlays = () => {
    setEditingEvent(null);
    setViewingEvent(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchData();
  }, [status, router]);

  useEffect(() => {
    closeOverlays();
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeOverlays();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const results = await Promise.all([
        fetchNamedResource("Schools", "/api/schools/list"),
        fetchNamedResource("Events", "/api/events?summary=1"),
        fetchNamedResource("Partners", "/api/external-organizers"),
        fetchNamedResource("Event proposals", "/api/event-proposals"),
      ]);

      const [
        schoolsResult,
        eventsResult,
        partnersResult,
        proposalsResult,
      ] = results;
      const failed = results.filter((result) => !result.ok);

      if (schoolsResult.ok) {
        setSchools(schoolsResult.data.schools || []);
      }
      if (eventsResult.ok) {
        setEvents(eventsResult.data.events || []);
      }
      if (partnersResult.ok) {
        setPartners(partnersResult.data.data || []);
      }
      if (proposalsResult.ok) {
        const proposalData = proposalsResult.data.data || [];
        setProposals(
          proposalData.filter((proposal) =>
            ["APPROVED", "CONVERTED_TO_EVENT"].includes(proposal.status)
          )
        );
      }

      if (failed.length > 0) {
        const failedSummary = failed
          .map((result) => `${result.label}: ${result.error}`)
          .join(" | ");
        setLoadError(
          `Some dashboard data could not load: ${failed
            .map((result) => result.label)
            .join(", ")}. The dashboard is still usable; refresh after checking the server/database connection.`
        );
      }
    } catch (error) {
      setLoadError(
        "Dashboard data could not load. Please check the server/database connection and try refresh."
      );
    } finally {
      setLoading(false);
    }
  };

  const requestSchoolStatusUpdate = (school, newStatus) => {
    setConfirmState({
      type: "school-status",
      school,
      newStatus,
      title:
        newStatus === "APPROVED"
          ? "Approve this school?"
          : newStatus === "REJECTED"
          ? "Reject this school?"
          : "Update school status?",
      message: `${school.schoolName || school.email} will be marked as ${newStatus}.`,
      confirmLabel:
        newStatus === "APPROVED"
          ? "Approve school"
          : newStatus === "REJECTED"
          ? "Reject school"
          : "Update status",
      tone:
        newStatus === "REJECTED" || newStatus === "UNSUBSCRIBED"
          ? "danger"
          : "info",
      busy: false,
    });
  };

  const updateStatus = async (schoolId, newStatus) => {
    try {
      setConfirmState((current) => (current ? { ...current, busy: true } : current));
      setActionFeedback(null);
      const res = await fetch(`/api/schools/${schoolId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setSchools(
          schools.map((s) =>
            s._id === schoolId ? { ...s, status: newStatus } : s
          )
        );
        setActionFeedback({
          type: "success",
          title: "School status updated",
          message: `School is now ${newStatus}.`,
        });
      } else {
        setActionFeedback({
          type: "error",
          title: "School status update failed",
          message: data.message || "Failed to update status",
        });
      }
    } catch (error) {
      setActionFeedback({
        type: "error",
        title: "School status update failed",
        message: error.message,
      });
    } finally {
      setConfirmState(null);
    }
  };

  const requestResetSchoolPassword = (school) => {
    setConfirmState({
      type: "school-password",
      school,
      title: "Reset school password?",
      message: `The current password for ${school.schoolName} will stop working immediately and a new temporary password will be generated.`,
      confirmLabel: "Reset password",
      tone: "warning",
      busy: false,
    });
  };

  const resetSchoolPassword = async (school) => {
    try {
      setConfirmState((current) => (current ? { ...current, busy: true } : current));
      setActionFeedback(null);
      const res = await fetch(`/api/schools/${school._id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset school password");
      }

      if (data.data?.credentials) {
        setCredentialsModal({
          isOpen: true,
          credentials: data.data.credentials,
        });
      }
      setActionFeedback({
        type: "success",
        title: "Password reset",
        message: `New credentials are ready for ${school.schoolName}.`,
      });
    } catch (error) {
      setActionFeedback({
        type: "error",
        title: "Password reset failed",
        message: error.message,
      });
    } finally {
      setConfirmState(null);
    }
  };

  // Event CRUD
  const requestArchiveEvent = (event) => {
    setConfirmState({
      type: "event-archive",
      event,
      title: "Archive this event?",
      message: `${event.title} will move to history. You can restore it later.`,
      confirmLabel: "Archive event",
      tone: "danger",
      busy: false,
    });
  };

  const deleteEvent = async (id) => {
    setLastError(null);
    setDeletingId(id);
    try {
      setConfirmState((current) => (current ? { ...current, busy: true } : current));
      setActionFeedback(null);
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents(
          events.map((e) =>
            e._id === id ? { ...e, lifecycleStatus: "ARCHIVED" } : e
          )
        );
        setActionFeedback({
          type: "success",
          title: "Event archived",
          message: "The event moved to archived history.",
        });
      } else {
        const data = await res.json();
        const msg = `Failed: ${data.message} (${res.status})`;
        setLastError(msg);
        setActionFeedback({
          type: "error",
          title: "Event archive failed",
          message: msg,
        });
      }
    } catch (error) {
      setLastError(`Error: ${error.message}`);
      setActionFeedback({
        type: "error",
        title: "Event archive failed",
        message: `Network/Client Error: ${error.message}`,
      });
    } finally {
      setDeletingId(null);
      setConfirmState(null);
    }
  };

  const updateEventStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStatus: status }),
      });
      if (res.ok) {
        setEvents(
          events.map((e) => (e._id === id ? { ...e, lifecycleStatus: status } : e))
        );
        setActionFeedback({
          type: "success",
          title: "Event status updated",
          message: `Event moved to ${status.toLowerCase()}.`,
        });
      } else {
        setActionFeedback({
          type: "error",
          title: "Event status update failed",
          message: "Failed to update event status",
        });
      }
    } catch (error) {
      // Error already handled in state
    }
  };

  const pendingSchools = schools.filter((s) => s.status === "PENDING");
  const registeredSchools = schools.filter((s) => s.status !== "PENDING");
  const schoolProvinceOptions = [
    "All Provinces",
    ...new Set(
      registeredSchools
        .map(getSchoolProvince)
        .filter(Boolean)
    ),
  ];
  const districtSource =
    schoolProvince === "All Provinces"
      ? registeredSchools
      : registeredSchools.filter(
          (school) => getSchoolProvince(school) === schoolProvince
        );
  const schoolDistrictOptions = [
    "All Districts",
    ...new Set(
      districtSource
        .map(getSchoolDistrict)
        .filter(Boolean)
    ),
  ];
  const filteredRegisteredSchools = registeredSchools.filter((school) => {
    const query = schoolSearch.trim().toLowerCase();
    if (
      schoolProvince !== "All Provinces" &&
      getSchoolProvince(school) !== schoolProvince
    ) {
      return false;
    }
    if (
      schoolDistrict !== "All Districts" &&
      getSchoolDistrict(school) !== schoolDistrict
    ) {
      return false;
    }
    if (!query) return true;
    const searchable = [
      school.schoolName,
      school.principalName,
      school.email,
      school.schoolLocation,
      getSchoolProvince(school),
      getSchoolDistrict(school),
      school.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(query);
  });
  const platformEvents = events.filter(
    (event) => (event.eventScope || "PLATFORM") === "PLATFORM"
  );
  const activeEvents = platformEvents.filter(
    (event) => (event.lifecycleStatus || "ACTIVE") === "ACTIVE"
  );
  const completedEvents = platformEvents.filter(
    (event) => (event.lifecycleStatus || "ACTIVE") === "COMPLETED"
  );
  const archivedEvents = platformEvents.filter(
    (event) => (event.lifecycleStatus || "ACTIVE") === "ARCHIVED"
  );

  return (
    <DashboardLayout>
      <PageHeader
        icon={FaLayerGroup}
        eyebrow="Admin"
        title="Dashboard"
        description="Use the left menu to approve schools, manage events, publish notices, and update platform settings."
      />

      {(loading || loadError) && (
        <div className="mb-6">
          <AlertBanner
            type={loadError ? "warning" : "info"}
            title={loadError ? "Some data could not load" : "Loading dashboard"}
            message={loadError || "Loading schools, events, partners, and proposals..."}
          />
        </div>
      )}

      {actionFeedback && (
        <div className="mb-6">
          <AlertBanner
            type={actionFeedback.type}
            title={actionFeedback.title}
            message={actionFeedback.message}
          />
        </div>
      )}

      {/* Content */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-slate-500">
                  School onboarding
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Pending Approvals
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-400">
                Review new school requests before they can manage students,
                events, notices, and magazine publishing.
              </p>
            </div>
            {pendingSchools.length === 0 ? (
              <EmptyState
                icon={FaCheckCircle}
                title="No pending registrations"
                description="New school requests will appear here for approval."
              />
            ) : (
              <div className="grid gap-4">
                {pendingSchools.map((school) => (
                  <div
                    key={school._id}
                    className="bg-slate-950/60 p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {school.schoolName}
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                          PENDING
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-300">
                        <p>
                          <span className="text-slate-500">Principal:</span>{" "}
                          {school.principalName}
                        </p>
                        <p>
                          <span className="text-slate-500">Email:</span>{" "}
                          {school.email}
                        </p>
                        <p>
                          <span className="text-slate-500">Phone:</span>{" "}
                          {school.schoolPhone || "N/A"}
                        </p>
                        <p>
                          <span className="text-slate-500">Location:</span>{" "}
                          {school.schoolLocation}
                        </p>
                        <p>
                          <span className="text-slate-500">Website:</span>{" "}
                          {school.website || "N/A"}
                        </p>
                        <p>
                          <span className="text-slate-500">Est. Year:</span>{" "}
                          {school.establishedYear || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => requestSchoolStatusUpdate(school, "APPROVED")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition"
                      >
                        <FaCheckCircle /> Approve
                      </button>
                      <button
                        onClick={() => requestSchoolStatusUpdate(school, "REJECTED")}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition"
                      >
                        <FaTimesCircle /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "schools" && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-slate-500">
                Network
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Registered Schools
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Manage access and reset credentials for approved schools.
            </p>
          </div>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#e6eaf7] bg-white p-4 md:flex-row md:items-end">
            <label className="block min-w-0 flex-1">
              <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
                <FaSearch className="text-[#4326e8]" />
                Search school
              </span>
              <input
                value={schoolSearch}
                onChange={(event) => setSchoolSearch(event.target.value)}
                placeholder="Search school, principal, email, status, or location..."
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:bg-white focus:ring-4 focus:ring-[#4326e8]/10"
              />
            </label>
            <label className="block min-w-0 md:w-56">
              <span className="mb-1.5 block text-[10px] font-black uppercase text-[#52657d]">
                Province
              </span>
              <select
                value={schoolProvince}
                onChange={(event) => {
                  setSchoolProvince(event.target.value);
                  setSchoolDistrict("All Districts");
                }}
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
              >
                {schoolProvinceOptions.map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 md:w-56">
              <span className="mb-1.5 block text-[10px] font-black uppercase text-[#52657d]">
                District
              </span>
              <select
                value={schoolDistrict}
                onChange={(event) => setSchoolDistrict(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
              >
                {schoolDistrictOptions.map((district) => (
                  <option key={district}>{district}</option>
                ))}
              </select>
            </label>
            {(schoolSearch ||
              schoolProvince !== "All Provinces" ||
              schoolDistrict !== "All Districts") && (
              <button
                type="button"
                onClick={() => {
                  setSchoolSearch("");
                  setSchoolProvince("All Provinces");
                  setSchoolDistrict("All Districts");
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
              >
                Clear
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">School Name</th>
                  <th className="p-3">Principal</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Support</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegisteredSchools
                  .map((school) => {
                    const status = school.status || "SUBSCRIBED";
                    const isActive = ["SUBSCRIBED", "APPROVED"].includes(
                      status
                    );
                    return (
                      <tr
                        key={school._id}
                        className="border-b border-slate-800 hover:bg-slate-800/50"
                      >
                        <td className="p-3 font-medium text-white">
                          {school.schoolName}
                        </td>
                        <td className="p-3">{school.principalName || "-"}</td>
                        <td className="p-3">{school.email}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => requestResetSchoolPassword(school)}
                            className="flex items-center gap-2 px-3 py-1 rounded transition bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                          >
                            <FaKey />
                            Reset password
                          </button>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() =>
                              requestSchoolStatusUpdate(
                                school,
                                isActive ? "UNSUBSCRIBED" : "APPROVED"
                              )
                            }
                            className={`flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black shadow-sm transition ${
                              isActive
                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            style={{ color: "#ffffff" }}
                          >
                            {isActive ? (
                              <FaToggleOn style={{ color: "#ffffff" }} />
                            ) : (
                              <FaToggleOff style={{ color: "#ffffff" }} />
                            )}
                            <span style={{ color: "#ffffff" }}>
                              {isActive ? "Deactivate" : "Activate"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {filteredRegisteredSchools.length === 0 && (
              <div className="rounded-b-xl border-x border-b border-[#e6eaf7] bg-white p-8 text-center text-sm font-semibold text-[#52657d]">
                No schools match your search.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "partners" && (
        <AdminPartnerWorkspace onChanged={fetchData} />
      )}

      {activeTab === "notices" && (
        <NoticeManager
          scopeMode="platform"
          title="Platform Notice Center"
          subtitle="Publish platform-wide updates that appear inside school dashboards and notification panels."
        />
      )}


      {activeTab === "spotlight" && <SchoolPromotionManager />}

      {activeTab === "events" && (
        <div className="space-y-6">
          {viewingEvent ? (
            <EventParticipantsView
              event={viewingEvent}
              onBack={() => setViewingEvent(null)}
            />
          ) : (
            <>
              <div className="rounded-2xl border border-[#e1e7f2] bg-white p-2 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "manage", label: "Manage Events" },
                    { id: "completed", label: "Completed Events" },
                    { id: "archived", label: "Archived Events" },
                    { id: "create", label: "Create Event" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setEventWorkspaceTab(tab.id)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        eventWorkspaceTab === tab.id
                          ? "bg-purple-700 text-white"
                          : "text-[#24314d] hover:bg-[#f8fbff] hover:text-purple-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {eventWorkspaceTab === "create" && (
                <SendEventForm
                  partners={partners}
                  proposals={proposals}
                  onEventCreated={() => {
                    fetchData();
                    setEventWorkspaceTab("manage");
                  }}
                  initialData={null}
                />
              )}

              {eventWorkspaceTab === "manage" && (
                <div className="rounded-2xl border border-[#e1e7f2] bg-white p-6 shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
                {lastError && (
                  <div className="mb-4">
                    <AlertBanner type="error" title="Event action failed" message={lastError} />
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-normal text-[#75869b]">
                      Active competitions
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#17120a]">
                      Platform Events
                    </h2>
                  </div>
                </div>

                {activeEvents.length === 0 ? (
                  <EmptyState
                    icon={FaCalendarAlt}
                    title="No active platform events"
                    description="Create a platform event when you are ready to invite schools."
                  />
                ) : (
                  <div className="space-y-4">
                    {activeEvents.map((event) => (
                        <EventCard
                          key={event._id}
                          event={event}
                          onDelete={() => requestArchiveEvent(event)}
                          onUpdateStatus={updateEventStatus}
                          isDeleting={deletingId === event._id}
                          onEdit={(e) => {
                            setEditingEvent(e);
                          }}
                          onViewParticipants={(e) => setViewingEvent(e)}
                          actionMode="manage"
                        />
                    ))}
                  </div>
                )}
                </div>
              )}

              {eventWorkspaceTab === "completed" && (
                <div className="rounded-2xl border border-[#e1e7f2] bg-white p-6 shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-black text-[#17120a]">
                      Completed Platform Events
                    </h2>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                      Closed competitions with published or finalized results
                    </div>
                  </div>

                  {completedEvents.length === 0 ? (
                    <EmptyState
                      icon={FaCheckCircle}
                      title="No completed events yet"
                      description="Completed platform events will appear here after competitions close."
                    />
                  ) : (
                    <div className="space-y-4">
                      {completedEvents.map((event) => (
                          <EventCard
                            key={event._id}
                            event={event}
                            onDelete={() => requestArchiveEvent(event)}
                            onUpdateStatus={updateEventStatus}
                            isDeleting={deletingId === event._id}
                            onViewParticipants={(e) => setViewingEvent(e)}
                            actionMode="completed"
                          />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {eventWorkspaceTab === "archived" && (
                <div className="rounded-2xl border border-[#e1e7f2] bg-white p-6 shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-black text-[#17120a]">
                      Archived Platform Events
                    </h2>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-[#0a2f66]">
                      Archived events stay available for review and can be restored.
                    </div>
                  </div>

                  {archivedEvents.length === 0 ? (
                    <EmptyState
                      icon={FaTrash}
                      title="No archived events"
                      description="Archived events will appear here for historical review or cleanup."
                    />
                  ) : (
                    <div className="space-y-4">
                      {archivedEvents.map((event) => (
                          <EventCard
                            key={event._id}
                            event={event}
                            onDelete={() => requestArchiveEvent(event)}
                            onUpdateStatus={updateEventStatus}
                            isDeleting={deletingId === event._id}
                            onEdit={(e) => {
                              setEditingEvent(e);
                            }}
                            onViewParticipants={(e) => setViewingEvent(e)}
                            actionMode="archived"
                          />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingEvent(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-700"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEditingEvent(null)}
              className="absolute right-4 top-4 z-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 text-sm"
            >
              Close
            </button>
            <div className="p-1">
              <SendEventForm
                partners={partners}
                proposals={proposals}
                onEventCreated={() => {
                  fetchData();
                  setEditingEvent(null);
                }}
                initialData={editingEvent}
                onCancel={() => setEditingEvent(null)}
              />
            </div>
          </div>
        </div>
      )}

      <CredentialsModal
        isOpen={credentialsModal.isOpen}
        credentials={credentialsModal.credentials}
        onClose={() =>
          setCredentialsModal({ isOpen: false, credentials: null })
        }
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        busy={Boolean(confirmState?.busy)}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (confirmState?.type === "school-status") {
            updateStatus(confirmState.school._id, confirmState.newStatus);
          } else if (confirmState?.type === "school-password") {
            resetSchoolPassword(confirmState.school);
          } else if (confirmState?.type === "event-archive") {
            deleteEvent(confirmState.event._id);
          }
        }}
      />
    </DashboardLayout>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-6 text-slate-200">
          <LoadingState
            title="Loading super admin dashboard"
            message="Preparing schools, platform events, notices, and challenges."
          />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
