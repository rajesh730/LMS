"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Sidebar from "@/components/Sidebar";
import EventFeed from "./EventFeed";
import CSVUploader from "@/components/CSVUploader";
import CredentialsModal from "@/components/CredentialsModal";
import PasswordField from "@/components/PasswordField";

// Lazy load heavy components
const AttendanceManager = dynamic(
  () => import("@/components/AttendanceManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading attendance...</div>
    ),
  }
);
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
const TeacherAttendanceReport = dynamic(
  () => import("@/components/TeacherAttendanceReport"),
  {
    loading: () => <div className="p-4 text-slate-400">Loading report...</div>,
  }
);const ExamManager = dynamic(
  () => import("@/components/dashboard/ExamManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading exams...</div>
    ),
  }
);
const GradingScaleManager = dynamic(
  () => import("@/components/dashboard/GradingScaleManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading grading scales...</div>
    ),
  }
);
const AcademicSection = dynamic(
  () => import("./AcademicSection"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading academic...</div>
    ),
  }
);
const CurriculumManager = dynamic(
  () => import("@/components/CurriculumManager"),
  {
    loading: () => (
      <div className="p-4 text-slate-400">Loading curriculum...</div>
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

import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCalendarCheck,
  FaSignOutAlt,
  FaKey,
  FaDownload,
  FaHeadset,
  FaExclamationTriangle,
  FaClock,
} from "react-icons/fa";
import EventHub from "@/components/events/EventHub";
import NoticeManager from "@/components/NoticeManager";

export default function SchoolDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [attendanceSubTab, setAttendanceSubTab] = useState("students"); // 'students' or 'teachers'
  const [selectedGradeForStudents, setSelectedGradeForStudents] = useState(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
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
    roles: ["SUBJECT_TEACHER"],
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

  // Check for active academic year or pending status
  const isPending = session?.user?.status === "PENDING";
  const hasActiveYear = schoolConfig?.currentAcademicYear;
  const isRestricted = isPending || (!loading && !hasActiveYear);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchData();
  }, [status, router]);

  // Force redirect to settings if no active year (but not if pending)
  useEffect(() => {
    if (!isPending && isRestricted && activeTab !== 'settings') {
        router.replace('/school/dashboard?tab=settings');
    }
  }, [isRestricted, activeTab, router, isPending]);

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
            configData.config || { teacherRoles: [], subjects: [] }
        );
      } else {
        setSchoolConfig({ teacherRoles: [], subjects: [] });
      }
    } catch (error) {
      console.error("Error fetching data", error);
      setSchoolConfig({ teacherRoles: [], subjects: [] });
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
          roles: ["SUBJECT_TEACHER"],
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
        alert(`Successfully imported ${resData.count} teachers`);
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

  const updateSchoolConfig = async (newRoles, newSubjects) => {
    try {
      const payload = {};
      if (newRoles) payload.teacherRoles = newRoles;
      if (newSubjects) payload.subjects = newSubjects;

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
              School Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Manage your school operations efficiently
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

        {!isPending && isRestricted && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 mb-6 rounded-xl flex items-center gap-3 text-yellow-200 animate-pulse">
                <FaExclamationTriangle className="text-yellow-500 text-xl" />
                <div>
                    <h3 className="font-bold">Action Required</h3>
                    <p className="text-sm text-yellow-200/80">Please activate an Academic Year in the Settings below to unlock the full dashboard.</p>
                </div>
            </div>
        )}

        {/* Navigation Tabs - Hide if Pending */}
        {!isPending && (
        <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1 overflow-x-auto">
          {[
            "overview",
            "students",
            "teachers",
            "academic",
            "exams",
            "grading",
            "attendance",
            "notices",
            "events",
            "settings"
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
                ? "Event Management"
                : tab === "notices"
                ? "Notice Board"
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
                Upcoming Events
              </h2>
              <EventFeed />
            </div>
          </>
        )}

        {activeTab === "students" && <StudentManager initialGrade={selectedGradeForStudents} />}

        {activeTab === "teachers" && <TeacherManager />}

        {activeTab === "academic" && (
          <div className="space-y-6">
            <AcademicSection
              onManageGrade={(grade) => {
                setSelectedGradeForStudents(grade);
                setActiveTab("students");
              }}
            />
          </div>
        )}

        {activeTab === "exams" && <ExamManager />}

        {activeTab === "grading" && <GradingScaleManager />}

        {activeTab === "curriculum" && <CurriculumManager />}
        {activeTab === "support" && <SupportTicketManager />}
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

        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Attendance Subtabs */}
            <div className="flex gap-4 border-b border-slate-700 pb-2">
              <button
                onClick={() => setAttendanceSubTab("students")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  attendanceSubTab === "students"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Student Attendance
              </button>
              <button
                onClick={() => setAttendanceSubTab("teachers")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  attendanceSubTab === "teachers"
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Teacher Attendance
              </button>
            </div>

            {attendanceSubTab === "students" && (
              <AttendanceManager
                teachers={teachers}
                grades={schoolConfig.grades || []}
              />
            )}

            {attendanceSubTab === "teachers" && <TeacherAttendanceReport />}
          </div>
        )}

        {activeTab === "events" && <EventHub />}

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
