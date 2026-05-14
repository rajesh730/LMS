"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdminTopNav from "@/components/AdminTopNav";
import AdminPartnerWorkspace from "@/components/partners/AdminPartnerWorkspace";
import CredentialsModal from "@/components/CredentialsModal";
import SendEventForm from "./SendEventForm";
import EventCard from "./EventCard";

// Lazy load the participants view component
const EventParticipantsView = dynamic(() => import("./EventParticipantsView"), {
  loading: () => (
    <div className="p-4 text-slate-400">Loading participants...</div>
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
} from "react-icons/fa";

const FETCH_TIMEOUT_MS = 10000;

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [viewingEvent, setViewingEvent] = useState(null);
  const [eventWorkspaceTab, setEventWorkspaceTab] = useState("manage");
  const [deletingId, setDeletingId] = useState(null);
  const [lastError, setLastError] = useState(null);
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
        console.warn("Some admin dashboard data failed to load:", failedSummary);
        setLoadError(
          `Some dashboard data could not load: ${failed
            .map((result) => result.label)
            .join(", ")}. The dashboard is still usable; refresh after checking the server/database connection.`
        );
      }
    } catch (error) {
      console.error("Error fetching data", error);
      setLoadError(
        "Dashboard data could not load. Please check the server/database connection and try refresh."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (schoolId, newStatus) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`))
      return;

    try {
      console.log(`Updating school ${schoolId} to status: ${newStatus}`);
      const res = await fetch(`/api/schools/${schoolId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);
      
      if (res.ok) {
        console.log("✓ Status updated successfully");
        setSchools(
          schools.map((s) =>
            s._id === schoolId ? { ...s, status: newStatus } : s
          )
        );
      } else {
        console.error("❌ Status update failed:", data.message);
        alert(`Error: ${data.message || "Failed to update status"}`);
      }
    } catch (error) {
      console.error("❌ Error updating status", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetSchoolPassword = async (school) => {
    if (
      !confirm(
        `Reset the password for ${school.schoolName}? The current password will stop working immediately.`
      )
    ) {
      return;
    }

    try {
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
    } catch (error) {
      console.error("Error resetting school password", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Event CRUD
  const deleteEvent = async (id, permanent = false) => {
    setLastError(null);
    console.log("Deleting event with ID:", id, "Permanent:", permanent);
    if (
      !confirm(
        permanent
          ? "Are you sure you want to PERMANENTLY delete this event? This cannot be undone."
          : "Are you sure you want to archive this event?"
      )
    )
      return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${id}?permanent=${permanent}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (permanent) {
          setEvents(events.filter((e) => e._id !== id));
        } else {
          // If soft delete (archive), update local state to reflect archived status
          setEvents(
            events.map((e) =>
              e._id === id ? { ...e, lifecycleStatus: "ARCHIVED" } : e
            )
          );
        }
      } else {
        const data = await res.json();
        console.error("Failed to delete event:", data);
        const msg = `Failed: ${data.message} (${res.status})`;
        setLastError(msg);
        alert(msg);
      }
    } catch (error) {
      console.error("Error deleting event", error);
      setLastError(`Error: ${error.message}`);
      alert(`Network/Client Error: ${error.message}`);
    } finally {
      setDeletingId(null);
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
      } else {
        alert("Failed to update event status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const pendingSchools = schools.filter((s) => s.status === "PENDING");
  const platformEvents = events.filter(
    (event) => (event.eventScope || "PLATFORM") === "PLATFORM"
  );

  return (
    <DashboardLayout>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Platform Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Oversee schools, partners, and platform competitions
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Logged in as:{" "}
            <span className="text-yellow-400">
              {session?.user?.role || "Unknown"}
            </span>{" "}
            | ID: {session?.user?.id}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <AdminTopNav pendingCount={pendingSchools.length} />

      {(loading || loadError) && (
        <div
          className={`mb-6 rounded-2xl border p-4 text-sm ${
            loadError
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
              : "border-blue-500/30 bg-blue-500/10 text-blue-100"
          }`}
        >
          {loadError || "Loading dashboard data..."}
        </div>
      )}

      {/* Content */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              Pending Approvals
            </h2>
            {pendingSchools.length === 0 ? (
              <p className="text-slate-500 italic">No pending registrations.</p>
            ) : (
              <div className="grid gap-4">
                {pendingSchools.map((school) => (
                  <div
                    key={school._id}
                    className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between gap-4"
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
                        onClick={() => updateStatus(school._id, "APPROVED")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center gap-2 font-medium transition"
                      >
                        <FaCheckCircle /> Approve
                      </button>
                      <button
                        onClick={() => updateStatus(school._id, "REJECTED")}
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
          <h2 className="text-xl font-semibold text-white mb-4">
            Registered Schools
          </h2>
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
                {schools
                  .filter((s) => s.status !== "PENDING")
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
                            onClick={() => resetSchoolPassword(school)}
                            className="flex items-center gap-2 px-3 py-1 rounded transition bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                          >
                            <FaKey />
                            Reset password
                          </button>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() =>
                              updateStatus(
                                school._id,
                                isActive ? "UNSUBSCRIBED" : "APPROVED"
                              )
                            }
                            className={`flex items-center gap-2 px-3 py-1 rounded transition ${
                              isActive
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            }`}
                          >
                            {isActive ? <FaToggleOn /> : <FaToggleOff />}
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "partners" && (
        <AdminPartnerWorkspace onChanged={fetchData} />
      )}

      {activeTab === "events" && (
        <div className="space-y-6">
          {viewingEvent ? (
            <EventParticipantsView
              event={viewingEvent}
              onBack={() => setViewingEvent(null)}
            />
          ) : (
            <>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-2">
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
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                {lastError && (
                  <div className="mb-4 p-4 bg-red-500/20 text-red-200 border border-red-500 rounded text-lg font-bold">
                    {lastError}
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    Platform Events
                  </h2>
                </div>

                {platformEvents.filter((e) => {
                  const status = e.lifecycleStatus || "ACTIVE";
                  return status === "ACTIVE";
                }).length === 0 ? (
                  <p className="text-slate-500 italic">
                    No active events found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {platformEvents
                      .filter((e) => {
                        const status = e.lifecycleStatus || "ACTIVE";
                        return status === "ACTIVE";
                      })
                      .map((event) => (
                        <EventCard
                          key={event._id}
                          event={event}
                          onDelete={deleteEvent}
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
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-semibold text-white">
                      Completed Platform Events
                    </h2>
                    <div className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 border border-emerald-500/20">
                      Closed competitions with published or finalized results
                    </div>
                  </div>

                  {platformEvents.filter(
                    (event) => (event.lifecycleStatus || "ACTIVE") === "COMPLETED"
                  ).length === 0 ? (
                    <p className="text-slate-500 italic">
                      No completed events found.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {platformEvents
                        .filter(
                          (event) =>
                            (event.lifecycleStatus || "ACTIVE") === "COMPLETED"
                        )
                        .map((event) => (
                          <EventCard
                            key={event._id}
                            event={event}
                            onDelete={deleteEvent}
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
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-semibold text-white">
                      Archived Platform Events
                    </h2>
                    <div className="rounded-lg bg-orange-500/10 px-4 py-2 text-sm text-orange-300 border border-orange-500/20">
                      Archive history and permanent cleanup for old events
                    </div>
                  </div>

                  {platformEvents.filter(
                    (event) => (event.lifecycleStatus || "ACTIVE") === "ARCHIVED"
                  ).length === 0 ? (
                    <p className="text-slate-500 italic">
                      No archived events found.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {platformEvents
                        .filter(
                          (event) =>
                            (event.lifecycleStatus || "ACTIVE") === "ARCHIVED"
                        )
                        .map((event) => (
                          <EventCard
                            key={event._id}
                            event={event}
                            onDelete={deleteEvent}
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
    </DashboardLayout>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
