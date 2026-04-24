"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import EventFeed from "./EventFeed";
import CredentialsModal from "@/components/CredentialsModal";

const StudentManager = dynamic(
  () => import("@/components/dashboard/StudentManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading students...</div>
    ),
  }
);
const TeacherManager = dynamic(
  () => import("@/components/dashboard/TeacherManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading teachers...</div>
    ),
  }
);
const DashboardOverview = dynamic(
  () => import("@/components/DashboardOverview"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading overview...</div>
    ),
  }
);
const SupportTicketManager = dynamic(
  () => import("@/components/support/SupportTicketManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading support...</div>
    ),
  }
);
const ParentCommunicationManager = dynamic(
  () => import("@/components/ParentCommunicationManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading communication...</div>
    ),
  }
);
const EnhancedStudentRegistration = dynamic(
  () => import("@/components/EnhancedStudentRegistration"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading student registration...</div>
    ),
  }
);
const EnhancedTeacherRegistration = dynamic(
  () => import("@/components/EnhancedTeacherRegistration"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading teacher registration...</div>
    ),
  }
);
const SchoolSettingsManager = dynamic(
  () => import("@/components/SchoolSettingsManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading settings...</div>
    ),
  }
);
const ShowcaseProfileManager = dynamic(
  () => import("@/components/ShowcaseProfileManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading showcase profile...</div>
    ),
  }
);
const ClubManager = dynamic(() => import("@/components/ClubManager"), {
  loading: () => <div className="p-4 text-slate-400">Loading clubs...</div>,
});
const SubmissionReviewManager = dynamic(
  () => import("@/components/SubmissionReviewManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading submission review...</div>
    ),
  }
);
const EventResultsManager = dynamic(
  () => import("@/components/EventResultsManager"),
  {
    loading: () => <div className="p-4 text-slate-400">Loading results...</div>,
  }
);

import {
  FaCalendarCheck,
  FaSignOutAlt,
  FaBullhorn,
  FaClock,
} from "react-icons/fa";
import SchoolEventWorkspace from "@/components/events/SchoolEventWorkspace";
import NoticeManager from "@/components/NoticeManager";

function SchoolDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab === "judging" ? "results" : tab);
    }
  }, [searchParams]);

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms State
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    roles: ["MENTOR"],
    assignments: [],
    password: "",
  });
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Credentials Modal State
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  const [schoolConfig, setSchoolConfig] = useState({ teacherRoles: [] });

  const isPending = session?.user?.status === "PENDING";
  const isRestricted = isPending;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchData();
  }, [status, router]);

  const fetchData = async () => {
    try {
      const teachersRes = await fetch("/api/teachers", { cache: "no-store" });
      const configRes = await fetch("/api/school/config", {
        cache: "no-store",
      });

      if (teachersRes.ok) {
        setTeachers((await teachersRes.json()).teachers);
      } else {
        // For unauthorized or other errors, just clear teachers and avoid noisy console
        setTeachers([]);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        // Handle both { data: config } and { config: config } formats
        setSchoolConfig(
          configData.data ||
            configData.config || { teacherRoles: [] }
        );
      } else {
        setSchoolConfig({ teacherRoles: [] });
      }
    } catch (error) {
      console.error("Error fetching data", error);
      setSchoolConfig({ teacherRoles: [] });
    } finally {
      setLoading(false);
    }
  };

  // Student CRUD

  // Teacher CRUD
  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm),
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers([data.teacher, ...teachers]);
        // Show credentials modal
        if (data.credentials) {
          setCredentialsModal({ isOpen: true, credentials: data.credentials });
        }
        setTeacherForm({
          name: "",
          email: "",
          phone: "",
          subject: "",
          roles: ["MENTOR"],
          assignments: [],
          password: "",
        });
      }
    } catch (error) {
      console.error("Error creating teacher", error);
    }
  };

  const updateTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/teachers/${editingTeacher._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTeacher),
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(
          teachers.map((t) => (t._id === editingTeacher._id ? data.teacher : t))
        );
        setEditingTeacher(null);
      }
    } catch (error) {
      console.error("Error updating teacher", error);
    }
  };

  const deleteTeacher = async (id) => {
    if (!confirm("Delete this teacher?")) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (res.ok) setTeachers(teachers.filter((t) => t._id !== id));
    } catch (error) {
      console.error("Error deleting teacher", error);
    }
  };

  const resetTeacherPassword = async (id) => {
    if (
      !confirm(
        "Reset password for this teacher? A new password will be generated."
      )
    )
      return;
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        // Show credentials modal
        if (data.credentials) {
          setCredentialsModal({ isOpen: true, credentials: data.credentials });
        }
        // Update the teacher list
        fetchData();
      }
    } catch (error) {
      console.error("Error resetting password", error);
    }
  };

  const handleBulkTeacherUpload = async (data) => {
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        alert(`Successfully imported ${resData.count} mentors`);
        if (resData.credentials?.length > 0) {
          setCredentialsModal({
            isOpen: true,
            credentials: resData.credentials,
          });
        }
        fetchData(); // Reload to get updated list
      } else {
        const error = await res.json();
        alert(`Import failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Bulk Import Error:", error);
      alert("Error importing teachers");
    }
  };

  const updateSchoolConfig = async (newRoles) => {
    try {
      const payload = {};
      if (newRoles) payload.teacherRoles = newRoles;

      const res = await fetch("/api/school/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSchoolConfig(data.config);
      } else {
        alert("Failed to update config");
      }
    } catch (error) {
      console.error("Error updating config", error);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Sidebar role={session?.user?.role} isRestricted={isRestricted} isPending={isPending} />

      <main className="flex-1 p-8 ml-64 overflow-y-auto h-screen">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              School Talent Hub
            </h1>
            <p className="text-slate-400 mt-1">
              Run activities, mentor talent, and promote your school publicly
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-white">
                {session?.user?.name}
              </div>
              <div className="text-xs text-slate-400">
                {session?.user?.email}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full transition"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </header>

        {isPending && (
            <div className="bg-orange-500/10 border border-orange-500/30 p-6 mb-6 rounded-xl flex items-center gap-4 text-orange-200">
                <div className="p-3 bg-orange-500/20 rounded-full">
                    <FaClock className="text-orange-500 text-2xl" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Account Pending Approval</h3>
                    <p className="text-orange-200/80 mt-1">
                        Your school account is currently under review by the Super Admin. 
                        You will receive full access once your account is approved.
                    </p>
                </div>
            </div>
        )}

        {/* Navigation Tabs - Hide if Pending */}
        {!isPending && (
        <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            "overview",
            "students",
            "teachers",
            "clubs",
            "reviews",
            "results",
            "communication",
            "events"
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={isRestricted && tab !== 'settings'}
              className={`pb-3 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-slate-400 hover:text-slate-200"
              } ${isRestricted && tab !== 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab === "events"
                ? "Talent Events"
                : tab === "notices"
                ? "Notice Board"
                : tab === "teachers"
                ? "Mentors"
                : tab === "clubs"
                ? "Clubs"
                : tab === "reviews"
                ? "Submission Review"
                : tab === "results"
                ? "Results"
                : tab === "showcase"
                ? "Public Showcase"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        )}

        {/* Content Area - Hide if Pending */}
        {isPending ? (
            <div className="text-center py-20">
                <p className="text-slate-500">Please wait for administrator approval.</p>
            </div>
        ) : (
            <>
        {activeTab === "overview" && (
          <>
            <DashboardOverview />
            {/* Events Section */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mt-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <FaCalendarCheck className="text-emerald-400" />
                Upcoming Talent Events
              </h2>
              <EventFeed />
            </div>
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mt-8">
              <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                <FaBullhorn className="text-blue-400" />
                Platform Direction
              </h2>
              <p className="text-slate-400">
                This workspace is being reshaped around extracurricular activities, talent discovery, showcases, and inter-school competitions. Academic modules are being retired from the main product surface.
              </p>
            </div>
          </>
        )}

        {activeTab === "students" && <StudentManager />}

        {activeTab === "teachers" && <TeacherManager />}
        {activeTab === "clubs" && <ClubManager />}
        {activeTab === "reviews" && <SubmissionReviewManager />}
        {activeTab === "results" && (
          <EventResultsManager
            title="School Event Results"
            description="Finalize placements, keep participant history, and choose whether winners appear publicly."
          />
        )}
        {activeTab === "showcase" && <ShowcaseProfileManager />}
        {activeTab === "support" && <SupportTicketManager />}
        {activeTab === "communication" && <ParentCommunicationManager />}
        {activeTab === "register-student" && (
          <EnhancedStudentRegistration 
            schoolId={session?.user?.id} 
            onSuccess={() => router.refresh()} 
          />
        )}
        {activeTab === "register-teacher" && (
          <EnhancedTeacherRegistration 
            schoolId={session?.user?.id} 
            onSuccess={() => router.refresh()} 
          />
        )}
        {activeTab === "settings" && <SchoolSettingsManager />}

        {activeTab === "events" && <SchoolEventWorkspace />}

        {activeTab === "notices" && <NoticeManager />}
            </>
        )}

        {editingTeacher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">
                Edit Teacher
              </h3>
              <form onSubmit={updateTeacher} className="space-y-4">
                <input
                  type="text"
                  value={editingTeacher.name}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <input
                  type="email"
                  value={editingTeacher.email}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      email: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <input
                  type="text"
                  value={editingTeacher.subject}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      subject: e.target.value,
                    })
                  }
                  placeholder="Focus area"
                  className="w-full bg-slate-800 text-white p-2 rounded"
                />
                <div className="bg-slate-800 p-2 rounded">
                  <span className="text-slate-400 text-sm block mb-1">
                    Roles
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(schoolConfig?.teacherRoles || []).map((role) => (
                      <label
                        key={role}
                        className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editingTeacher.roles?.includes(role)}
                          onChange={(e) => {
                            const currentRoles = editingTeacher.roles || [];
                            const newRoles = e.target.checked
                              ? [...currentRoles, role]
                              : currentRoles.filter((r) => r !== role);
                            setEditingTeacher({
                              ...editingTeacher,
                              roles: newRoles,
                            });
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-emerald-500"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTeacher(null)}
                    className="text-slate-400 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
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
      </main>
    </div>
  );
}

export default function SchoolDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading dashboard...</div>}>
      <SchoolDashboardContent />
    </Suspense>
  );
}
