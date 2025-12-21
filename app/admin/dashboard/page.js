"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdminTopNav from "@/components/AdminTopNav";
import SendEventForm from "./SendEventForm";
import EventCard from "./EventCard";
import AcademicYearManager from "@/components/settings/AcademicYearManager";

// Lazy load the participants view component
const EventParticipantsView = dynamic(() => import("./EventParticipantsView"), {
  loading: () => (
    <div className="p-4 text-slate-400">Loading participants...</div>
  ),
});

import {
  FaSchool,
  FaLayerGroup,
  FaCalendarAlt,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
} from "react-icons/fa";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'approvals';
  const [schools, setSchools] = useState([]);
  const [groups, setGroups] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [eventFilter, setEventFilter] = useState("active"); // active, completed, archived

  // Group Form State
  const [groupName, setGroupName] = useState("");
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Editing State
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchData();
  }, [status, router]);

  const fetchData = async () => {
    try {
      const schoolsRes = await fetch("/api/schools/list", {
        cache: "no-store",
      });
      const groupsRes = await fetch("/api/groups", { cache: "no-store" });
      const eventsRes = await fetch("/api/events", { cache: "no-store" });

      if (schoolsRes.ok) setSchools((await schoolsRes.json()).schools);
      if (groupsRes.ok) setGroups((await groupsRes.json()).groups);
      if (eventsRes.ok) setEvents((await eventsRes.json()).events);
    } catch (error) {
      console.error("Error fetching data", error);
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

  // Group CRUD
  const createGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          schools: selectedSchools,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups([...groups, data.group]);
        setGroupName("");
        setSelectedSchools([]);
        setSearchTerm("");
      }
    } catch (error) {
      console.error("Error creating group", error);
    }
  };

  const updateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/groups/${editingGroup._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingGroup.name,
          schools: editingGroup.schools,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(
          groups.map((g) => (g._id === editingGroup._id ? data.group : g))
        );
        setEditingGroup(null);
      }
    } catch (error) {
      console.error("Error updating group", error);
    }
  };

  const deleteGroup = async (id) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) setGroups(groups.filter((g) => g._id !== id));
    } catch (error) {
      console.error("Error deleting group", error);
    }
  };

  const [deletingId, setDeletingId] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

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

  const handleSchoolSelection = (schoolId) => {
    if (selectedSchools.includes(schoolId)) {
      setSelectedSchools(selectedSchools.filter((id) => id !== schoolId));
    } else {
      setSelectedSchools([...selectedSchools, schoolId]);
    }
  };

  const filteredSchools = schools.filter((s) => {
    const isSubscribed = ["SUBSCRIBED", "APPROVED"].includes(
      s.status || "SUBSCRIBED"
    );
    const matchesSearch = s.schoolName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    return isSubscribed && matchesSearch;
  });

  const pendingSchools = schools.filter((s) => s.status === "PENDING");

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <DashboardLayout>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Super Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Manage schools, groups, and events
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

      {activeTab === "groups" && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              Create New Group
            </h2>
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-2 text-sm">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Primary Schools"
                  className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2 text-sm">
                  Select Schools (Active Only)
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search schools by name..."
                  className="w-full bg-slate-800 text-white rounded p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border border-slate-700"
                />
                <div className="grid md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                  {filteredSchools.map((school) => (
                    <label
                      key={school._id}
                      className="flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSchools.includes(school._id)}
                        onChange={() => handleSchoolSelection(school._id)}
                        className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-200 truncate">
                        {school.schoolName}
                      </span>
                    </label>
                  ))}
                  {filteredSchools.length === 0 && (
                    <p className="text-slate-500 text-sm col-span-3 text-center py-2">
                      {searchTerm
                        ? "No matching schools found."
                        : "No active schools available."}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold w-full md:w-auto"
              >
                Create Group
              </button>
            </form>
          </div>

          {/* Edit Modal */}
          {editingGroup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">
                  Edit Group
                </h3>
                <form onSubmit={updateGroup} className="space-y-4">
                  <div>
                    <label className="block text-slate-400 mb-2 text-sm">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) =>
                        setEditingGroup({
                          ...editingGroup,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-2 text-sm">
                      Manage Members
                    </label>
                    <div className="max-h-40 overflow-y-auto bg-slate-800 p-2 rounded border border-slate-700">
                      {schools
                        .filter((s) =>
                          ["SUBSCRIBED", "APPROVED"].includes(
                            s.status || "SUBSCRIBED"
                          )
                        )
                        .map((school) => (
                          <label
                            key={school._id}
                            className="flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={editingGroup.schools.includes(
                                school._id
                              )}
                              onChange={() => {
                                const newSchools =
                                  editingGroup.schools.includes(school._id)
                                    ? editingGroup.schools.filter(
                                        (id) => id !== school._id
                                      )
                                    : [...editingGroup.schools, school._id];
                                setEditingGroup({
                                  ...editingGroup,
                                  schools: newSchools,
                                });
                              }}
                              className="rounded border-slate-600 bg-slate-700 text-blue-600"
                            />
                            <span className="text-sm text-slate-300">
                              {school.schoolName}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingGroup(null)}
                      className="text-slate-400 hover:text-white px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {groups.map((group) => (
              <div
                key={group._id}
                className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex justify-between items-start hover:border-slate-600 transition"
              >
                <div>
                  <h3 className="text-lg font-bold text-white">{group.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {group.schools.length} schools
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-2 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition"
                    title="Edit Group"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => deleteGroup(group._id)}
                    className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition"
                    title="Delete Group"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "academic-years" && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <AcademicYearManager />
        </div>
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
              <SendEventForm
                groups={groups}
                onEventCreated={() => {
                  fetchData();
                }}
                initialData={null}
              />

              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                {lastError && (
                  <div className="mb-4 p-4 bg-red-500/20 text-red-200 border border-red-500 rounded text-lg font-bold">
                    {lastError}
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    Existing Events
                  </h2>
                  <div className="flex bg-slate-800 p-1 rounded-lg">
                    {["active", "completed", "archived"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setEventFilter(filter)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          eventFilter === filter
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {events.filter((e) => {
                  const status = e.lifecycleStatus || "ACTIVE";
                  if (eventFilter === "active") return status === "ACTIVE";
                  if (eventFilter === "completed") return status === "COMPLETED";
                  if (eventFilter === "archived") return status === "ARCHIVED";
                  return true;
                }).length === 0 ? (
                  <p className="text-slate-500 italic">
                    No {eventFilter} events found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events
                      .filter((e) => {
                        const status = e.lifecycleStatus || "ACTIVE";
                        if (eventFilter === "active")
                          return status === "ACTIVE";
                        if (eventFilter === "completed")
                          return status === "COMPLETED";
                        if (eventFilter === "archived")
                          return status === "ARCHIVED";
                        return true;
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
                        />
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-700">
            <div className="p-1">
              <SendEventForm
                groups={groups}
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
    </DashboardLayout>
  );
}
