"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import CredentialsModal from "@/components/CredentialsModal";
import SchoolNotificationCenter from "@/components/school/SchoolNotificationCenter";
import SchoolNoticeBoard from "@/components/school/SchoolNoticeBoard";
import SchoolDailyOverview from "@/components/school/SchoolDailyOverview";
import WorkIndicatorBadge from "@/components/work-indicators/WorkIndicatorBadge";
import useWorkIndicators from "@/lib/useWorkIndicators";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";

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
const SupportTicketManager = dynamic(
  () => import("@/components/support/SupportTicketManager"),
  {
    loading: () => (
      <LoadingState title="Loading support" message="Preparing support tickets." />
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
const DashboardChallengeShowcase = dynamic(
  () => import("@/components/challenges/DashboardChallengeShowcase"),
  {
    loading: () => (
      <LoadingState title="Loading Pratyo Pulse" message="Preparing selected student responses." />
    ),
  }
);
import {
  FaCalendarCheck,
  FaFeatherAlt,
  FaSignOutAlt,
  FaBullhorn,
  FaClock,
  FaSchool,
  FaArrowRight,
  FaBookReader,
  FaTrophy,
  FaUsers,
  FaBars,
  FaSearch,
  FaRocket,
  FaFlag,
  FaCheckCircle,
  FaExternalLinkAlt,
} from "react-icons/fa";
import SchoolEventWorkspace from "@/components/events/SchoolEventWorkspace";

function SchoolCommandHero({ schoolName }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase text-[#0a2f66]">
            <FaSchool />
            School Command Center
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-[#17120a] md:text-5xl">
            Manage the work that students see every day
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52657d]">
            Use this hub to register students, run events, send notices, publish
            magazine articles, and showcase selected achievements.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["First", "Add students and teachers", FaUsers],
              ["Then", "Run events and notices", FaCalendarCheck],
              ["Finally", "Publish results and writing", FaFlag],
            ].map(([step, text, Icon]) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-purple-700 shadow-sm">
                  <Icon />
                </span>
                <span>
                  <span className="block text-[10px] font-black uppercase text-[#52657d]">
                    {step}
                  </span>
                  <strong className="block text-xs text-[#17120a]">{text}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-72 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8fbff] via-white to-emerald-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.22),transparent_25%),radial-gradient(circle_at_80%_78%,rgba(16,185,129,0.2),transparent_28%)]" />
          <div className="absolute bottom-8 left-1/2 h-36 w-48 -translate-x-1/2 rounded-t-3xl border border-[#cfe0f6] bg-white shadow-xl" />
          <div className="absolute bottom-8 left-1/2 h-24 w-14 -translate-x-1/2 rounded-t-xl bg-[#dbeaff]" />
          <div className="absolute bottom-44 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border-8 border-white bg-[#eaf2ff] shadow-lg" />
          <FaFlag className="absolute left-1/2 top-10 -translate-x-1/2 text-5xl text-[#0a2f66]" />
          <FaRocket className="absolute bottom-8 right-10 text-5xl text-purple-700" />
          <div className="absolute bottom-6 left-6 max-w-[12rem] rounded-xl bg-white/90 p-3 text-xs font-bold text-[#0a2f66] shadow-sm">
            {schoolName || "Your school"} workspace is ready.
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  indicator,
  tone = "blue",
}) {
  const toneMap = {
    blue: "border-[#b9d5f6] bg-[#eaf2ff] text-[#0a2f66] hover:border-[#7fb1ee]",
    emerald:
      "border-[#b9d5f6] bg-[#eaf2ff] text-[#0a2f66] hover:border-[#7fb1ee]",
    amber:
      "border-[#b9d5f6] bg-[#eaf2ff] text-[#0a2f66] hover:border-[#7fb1ee]",
    purple:
      "border-[#b9d5f6] bg-[#eaf2ff] text-[#0a2f66] hover:border-[#7fb1ee]",
    cyan: "border-[#b9d5f6] bg-white text-[#0a2f66] hover:border-[#7fb1ee]",
  };

  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 shadow-[0_10px_28px_rgba(10,47,102,0.08)] transition hover:-translate-y-0.5 ${toneMap[tone] || toneMap.blue
        }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dbeaff] text-[#0a2f66]">
          <Icon className="text-xl" />
        </span>
        <span className="flex items-center gap-2">
          <WorkIndicatorBadge
            count={indicator?.count}
            tone={indicator?.tone}
          />
          <FaArrowRight className="text-[#17120a] transition group-hover:translate-x-1 group-hover:text-[#0a2f66]" />
        </span>
      </div>
      <h3 className="mt-5 text-lg font-bold text-[#17120a]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#344f77]">{description}</p>
    </Link>
  );
}

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
        ["judging", "events"].includes(tabParam) ? "platform-events" : tabParam
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
  const { getIndicator } = useWorkIndicators({
    enabled: status === "authenticated" && !isPending,
  });

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

      <main className="min-h-screen flex-1 overflow-x-hidden bg-[#f8f9fd] px-4 py-4 sm:px-6 lg:ml-72 lg:h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-30 -mx-4 mb-5 border-b border-[#e6eaf7] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e6eaf7] bg-white text-[#0a2f66] shadow-sm transition hover:bg-[#eaf2ff] lg:hidden"
              aria-label="Open menu"
            >
              <FaBars />
            </button>
            <label className="relative hidden min-w-0 flex-1 md:block">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
              <input
                type="search"
                placeholder="Search students, events, notices..."
                className="h-11 w-full max-w-xl rounded-xl border border-[#e6eaf7] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-purple-300 focus:ring-4 focus:ring-purple-50"
              />
            </label>
            <div className="ml-auto flex items-center gap-3">
            <SchoolNotificationCenter />
            <div className="hidden text-right md:block">
              <div className="text-sm font-black text-[#17120a]">
                {session?.user?.name}
              </div>
              <div className="text-xs text-[#52657d]">
                {session?.user?.email}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a2f66] text-white transition hover:bg-[#123f82]"
              aria-label="Sign out"
            >
              <FaSignOutAlt />
            </button>
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
                <SchoolCommandHero schoolName={session?.user?.name} />
                <div className="mt-5">
                  <DashboardOverview />
                </div>
                <div className="mt-5">
                  <SchoolDailyOverview />
                </div>

                <section className="mt-5 rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-normal text-[#52657d]">
                        Quick actions
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-[#17120a]">
                        Pick the work area you need
                      </h2>
                    </div>
                    <p className="max-w-xl text-sm leading-6 text-[#344f77]">
                      These shortcuts match the real school workflow: students,
                      events, student notices, publishing, and school spotlight.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <QuickActionCard
                      href="/school/dashboard?tab=students"
                      icon={FaUsers}
                      title="Students"
                      description="Add student accounts, view credentials, and keep profiles ready for events and writing."
                      tone="blue"
                    />
                    <QuickActionCard
                      href="/school/dashboard?tab=platform-events"
                      icon={FaCalendarCheck}
                      title="Platform Events"
                      description="Accept platform invitations and manage the teams your school sends."
                      indicator={getIndicator("school.platformEvents")}
                      tone="emerald"
                    />
                    <QuickActionCard
                      href="/school/dashboard?tab=school-events"
                      icon={FaSchool}
                      title="School Events"
                      description="Create internal competitions, register participants, run rounds, and prepare certificates."
                      indicator={getIndicator("school.schoolEvents")}
                      tone="cyan"
                    />
                    <QuickActionCard
                      href="/school/dashboard?tab=student-notices"
                      icon={FaBullhorn}
                      title="Student Notices"
                      description="Send announcements directly to every student in your school dashboard."
                      tone="amber"
                    />
                    <QuickActionCard
                      href="/school/dashboard?tab=magazine"
                      icon={FaFeatherAlt}
                      title="School Magazine"
                      description="Review student writing and publish selected articles for the school community."
                      indicator={getIndicator("school.magazine")}
                      tone="purple"
                    />
                    <QuickActionCard
                      href="/school/dashboard?tab=challenge-showcase"
                      icon={FaTrophy}
                      title="Pratyo Pulse"
                      description="See platform-selected student challenge responses and promote strong work."
                      indicator={getIndicator("school.pratyoPulse")}
                      tone="emerald"
                    />
                  </div>
                </section>

                <div className="mt-8">
                  <AlertBanner
                    type="info"
                    title="Production note"
                    message="Keep daily announcements inside Student Notices, use School Magazine only for approved writing, and use Public Profile when you are ready to promote school achievements."
                    action={
                      <Link
                        href="/school/dashboard?tab=showcase"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#123f82]"
                      >
                        Open public profile
                        <FaExternalLinkAlt />
                      </Link>
                    }
                  />
                </div>
              </>
            )}

            {activeTab === "students" && <StudentManager />}

            {activeTab === "teachers" && <TeacherManager />}
            {activeTab === "showcase" && <ShowcaseProfileManager />}
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

            {activeTab === "platform-events" && (
              <SchoolEventWorkspace mode="platform" />
            )}
            {activeTab === "school-events" && <SchoolEventWorkspace mode="school" />}
            {activeTab === "challenge-showcase" && <DashboardChallengeShowcase />}

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
