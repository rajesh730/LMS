"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CredentialsModal from "@/components/CredentialsModal";
import SchoolNotificationCenter from "@/components/school/SchoolNotificationCenter";
import SchoolNoticeBoard from "@/components/school/SchoolNoticeBoard";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import AuthenticatedPublicLinkGuard from "@/components/AuthenticatedPublicLinkGuard";

const StudentManager = dynamic(
  () => import("@/components/dashboard/StudentManager"),
  {
    loading: () => (
      <LoadingState title="Loading students" message="Preparing your student records." />
    ),
  }
);
const TeacherManager = dynamic(
  () => import("@/components/dashboard/TeacherManager"),
  {
    loading: () => (
      <LoadingState title="Loading teachers" message="Preparing teacher and mentor records." />
    ),
  }
);
const DashboardOverview = dynamic(
  () => import("@/components/DashboardOverview"),
  {
    loading: () => (
      <LoadingState title="Loading overview" message="Preparing school dashboard statistics." />
    ),
  }
);
const FeedbackForm = dynamic(
  () => import("@/components/feedback/FeedbackForm"),
  {
    loading: () => (
      <LoadingState title="Loading feedback" message="Preparing feedback form." />
    ),
  }
);
const EnhancedStudentRegistration = dynamic(
  () => import("@/components/EnhancedStudentRegistration"),
  {
    loading: () => (
      <LoadingState title="Loading student registration" message="Preparing the student registration form." />
    ),
  }
);
const EnhancedTeacherRegistration = dynamic(
  () => import("@/components/EnhancedTeacherRegistration"),
  {
    loading: () => (
      <LoadingState title="Loading teacher registration" message="Preparing the teacher registration form." />
    ),
  }
);
const SchoolSettingsManager = dynamic(
  () => import("@/components/SchoolSettingsManager"),
  {
    loading: () => (
      <LoadingState title="Loading settings" message="Preparing school configuration." />
    ),
  }
);
const ShowcaseProfileManager = dynamic(
  () => import("@/components/ShowcaseProfileManager"),
  {
    loading: () => (
      <LoadingState title="Loading showcase profile" message="Preparing your public school profile." />
    ),
  }
);
const StudentNoticeManager = dynamic(
  () => import("@/components/school/StudentNoticeManager"),
  {
    loading: () => (
      <LoadingState title="Loading student notices" message="Preparing your notice board tools." />
    ),
  }
);
const SchoolMagazineManager = dynamic(
  () => import("@/components/school/SchoolMagazineManager"),
  {
    loading: () => (
      <LoadingState title="Loading school magazine" message="Preparing review and publishing tools." />
    ),
  }
);
import {
  FaClock,
  FaSchool,
  FaBars,
} from "react-icons/fa";
import SchoolEventWorkspace from "@/components/events/SchoolEventWorkspace";

function SchoolDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState("overview");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(
        ["judging", "events", "platform-events"].includes(tabParam)
          ? "school-events"
          : tabParam
      );
    }
  }, [tabParam]);

  useEffect(() => {
    if (!isNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isNavOpen]);

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

  const requestDeleteTeacher = (teacher) => {
    setConfirmState({
      type: "delete-teacher",
      teacher,
      title: "Archive this teacher?",
      message: `${teacher.name || "This teacher"} will be removed from active teacher records.`,
      confirmLabel: "Archive teacher",
      tone: "danger",
      busy: false,
    });
  };

  const deleteTeacher = async (id) => {
    try {
      setConfirmState((current) => (current ? { ...current, busy: true } : current));
      setFeedback(null);
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTeachers(teachers.filter((t) => t._id !== id));
        setFeedback({
          type: "success",
          title: "Teacher archived",
          message: "Teacher record moved out of the active list.",
        });
      }
    } catch (error) {
      console.error("Error deleting teacher", error);
      setFeedback({
        type: "error",
        title: "Teacher was not archived",
        message: error.message || "Please retry.",
      });
    } finally {
      setConfirmState(null);
    }
  };

  const requestResetTeacherPassword = (teacher) => {
    setConfirmState({
      type: "reset-teacher-password",
      teacher,
      title: "Reset teacher password?",
      message: `A new temporary password will be generated for ${teacher.name || "this teacher"}.`,
      confirmLabel: "Reset password",
      tone: "warning",
      busy: false,
    });
  };

  const resetTeacherPassword = async (id) => {
    try {
      setConfirmState((current) => (current ? { ...current, busy: true } : current));
      setFeedback(null);
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
        setFeedback({
          type: "success",
          title: "Password reset",
          message: "New teacher credentials are ready.",
        });
      }
    } catch (error) {
      console.error("Error resetting password", error);
      setFeedback({
        type: "error",
        title: "Password reset failed",
        message: error.message || "Please retry.",
      });
    } finally {
      setConfirmState(null);
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
        setFeedback({
          type: "success",
          title: "Teachers imported",
          message: `Successfully imported ${resData.count} mentors.`,
        });
        if (resData.credentials?.length > 0) {
          setCredentialsModal({
            isOpen: true,
            credentials: resData.credentials,
          });
        }
        fetchData(); // Reload to get updated list
      } else {
        const error = await res.json();
        setFeedback({
          type: "error",
          title: "Teacher import failed",
          message: error.message || "Please check the upload and retry.",
        });
      }
    } catch (error) {
      console.error("Bulk Import Error:", error);
      setFeedback({
        type: "error",
        title: "Teacher import failed",
        message: "Error importing teachers.",
      });
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
        setFeedback({
          type: "error",
          title: "Configuration update failed",
          message: "Failed to update config.",
        });
      }
    } catch (error) {
      console.error("Error updating config", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-200">
        <LoadingState
          title="Opening school dashboard"
          message="Loading students, events, notices, and publishing tools."
          className="min-h-[70vh]"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f1e8] text-[#17120a] font-sans">
      <AuthenticatedPublicLinkGuard />
      {isNavOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setIsNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
        />
      )}
      <Sidebar
        role={session?.user?.role}
        isRestricted={isRestricted}
        isPending={isPending}
        isMobileOpen={isNavOpen}
        onNavigate={() => setIsNavOpen(false)}
      />

      <main className="min-h-screen flex-1 overflow-x-hidden bg-[#f8f9fd] px-2 py-3 sm:px-6 sm:py-4 lg:ml-72 lg:h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-30 -mx-2 mb-4 border-b border-[#e6eaf7] bg-white/95 px-2 py-3 backdrop-blur sm:-mx-6 sm:mb-5 sm:px-6">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e6eaf7] bg-white text-[#0a2f66] shadow-sm transition hover:bg-[#eaf2ff] lg:hidden"
              aria-label="Open menu"
            >
              <FaBars />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#10142f]">
                School Dashboard
              </p>
              <p className="truncate text-xs font-bold text-[#526071]">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <SchoolNotificationCenter />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] pb-8">

        {isPending && (
          <div className="rounded-xl border border-[#2f7fdb]/30 bg-[#eaf2ff] p-6 mb-6 flex items-center gap-4 text-[#0a2f66]">
            <div className="p-3 bg-[#dbeaff] rounded-full">
              <FaClock className="text-[#0a2f66] text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#17120a]">Account Pending Approval</h3>
              <p className="text-[#344f77] mt-1">
                Your school account is currently under review by the Super Admin.
                You will receive full access once your account is approved.
              </p>
            </div>
          </div>
        )}

        {feedback && (
          <div className="mb-6">
            <AlertBanner
              type={feedback.type}
              title={feedback.title}
              message={feedback.message}
            />
          </div>
        )}

        {/* Content Area - Hide if Pending */}
        {isPending ? (
          <div className="text-center py-20">
            <AlertBanner
              type="warning"
              title="Approval required"
              message="Your school dashboard will unlock after the Super Admin approves this account."
            />
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <>
                <PageHeader
                  icon={FaSchool}
                  eyebrow="School workspace"
                  title="School Overview"
                  description="Review your school's student, teacher, event, grade, and recent activity status from one place."
                />
                <div className="mt-5">
                  <DashboardOverview />
                </div>
              </>
            )}

            {activeTab === "students" && <StudentManager />}

            {activeTab === "teachers" && <TeacherManager />}
            {activeTab === "showcase" && <ShowcaseProfileManager />}
            {activeTab === "feedback" && <FeedbackForm audience="school" />}
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

            {activeTab === "school-events" && <SchoolEventWorkspace />}
            {activeTab === "student-notices" && <StudentNoticeManager />}
            {activeTab === "notices" && <SchoolNoticeBoard />}
            {activeTab === "magazine" && <SchoolMagazineManager />}
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

        <ConfirmDialog
          open={Boolean(confirmState)}
          title={confirmState?.title}
          message={confirmState?.message}
          confirmLabel={confirmState?.confirmLabel}
          tone={confirmState?.tone}
          busy={Boolean(confirmState?.busy)}
          onClose={() => setConfirmState(null)}
          onConfirm={() => {
            if (confirmState?.type === "delete-teacher") {
              deleteTeacher(confirmState.teacher._id);
            } else if (confirmState?.type === "reset-teacher-password") {
              resetTeacherPassword(confirmState.teacher._id);
            }
          }}
        />
        </div>
      </main>
    </div>
  );
}

export default function SchoolDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-6 text-slate-200">
          <LoadingState title="Loading dashboard" message="Preparing your school workspace." />
        </div>
      }
    >
      <SchoolDashboardContent />
    </Suspense>
  );
}
