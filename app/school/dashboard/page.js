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
import PageHeader from "@/components/ui/PageHeader";
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
} from "react-icons/fa";
import SchoolEventWorkspace from "@/components/events/SchoolEventWorkspace";

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams?.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(`/school/dashboard${query ? `?${query}` : ""}`);
  };

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

      <main className="min-h-screen flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:ml-64 lg:h-screen lg:overflow-y-auto lg:p-8">
        <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d7cdbb] bg-white/80 px-4 py-2 text-sm font-semibold text-[#0a2f66] shadow-sm transition hover:bg-[#eaf2ff] lg:hidden"
            >
              <FaBars />
              Menu
            </button>
            <h1 className="text-2xl font-black tracking-tight text-[#17120a] sm:text-3xl">
              Pratyo School Hub
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#52657d] sm:text-base">
              Run activities, mentor talent, and promote your school publicly
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d7cdbb] bg-white/70 p-2 shadow-sm md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <SchoolNotificationCenter />
            <div className="text-right hidden md:block">
              <div className="text-sm font-semibold text-[#17120a]">
                {session?.user?.name}
              </div>
              <div className="text-xs text-[#52657d]">
                {session?.user?.email}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#0a2f66] text-white transition hover:bg-[#123f82]"
              aria-label="Sign out"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </header>

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

        {/* Navigation Tabs - Hide if Pending */}
        {!isPending && (
          <div className="mb-8 -mx-4 overflow-x-auto border-y border-[#d7cdbb] bg-white/65 px-4 py-2 shadow-sm sm:mx-0 sm:rounded-2xl sm:border sm:px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex min-w-max gap-2">
              {[
                { id: "overview" },
                { id: "students" },
                { id: "teachers" },
                { id: "platform-events", indicatorKey: "school.platformEvents" },
                { id: "school-events", indicatorKey: "school.schoolEvents" },
                { id: "challenge-showcase", indicatorKey: "school.pratyoPulse" },
                { id: "student-notices" },
                { id: "notices", indicatorKey: "school.receivedNotices" },
                { id: "magazine", indicatorKey: "school.magazine" },
                { id: "showcase" },
                { id: "settings" },
              ].map(({ id: tab, indicatorKey }) => {
                const indicator = getIndicator(indicatorKey);
                return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  disabled={isRestricted && tab !== 'settings'}
                  aria-pressed={activeTab === tab}
                  className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition relative whitespace-nowrap ${activeTab === tab
                      ? "bg-[#0a2f66] text-white shadow-sm"
                      : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
                    } ${isRestricted && tab !== 'settings' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {tab === "platform-events"
                    ? "Platform Events"
                    : tab === "school-events"
                      ? "School Events"
                      : tab === "challenge-showcase"
                        ? "Pratyo Pulse"
                        : tab === "student-notices"
                          ? "Student Notices"
                          : tab === "notices"
                            ? "Received Notices"
                            : tab === "magazine"
                              ? "School Magazine"
                              : tab === "teachers"
                                ? "Teachers"
                                : tab === "showcase"
                                  ? "Public Profile"
                                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <WorkIndicatorBadge
                    count={indicator.count}
                    tone={indicator.tone}
                    compact
                    className="ml-2 align-middle"
                  />
                </button>
              )})}
            </div>
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
                  eyebrow="School command center"
                  title="Manage the work that students see every day"
                  description="Use this hub to register students, run events, send notices, publish magazine articles, and showcase selected achievements without jumping across separate tools."
                  meta={
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[#d7cdbb] bg-[#eaf2ff] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#52657d]">
                          First
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17120a]">
                          Add students and teachers
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#d7cdbb] bg-[#eaf2ff] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#52657d]">
                          Then
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17120a]">
                          Run events and notices
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#d7cdbb] bg-[#eaf2ff] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#52657d]">
                          Finally
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#17120a]">
                          Publish results and writing
                        </p>
                      </div>
                    </div>
                  }
                />
                <div className="mt-8">
                  <SchoolDailyOverview />
                </div>
                <div className="mt-8">
                  <DashboardOverview />
                </div>

                <section className="mt-8 rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_14px_36px_rgba(10,47,102,0.06)]">
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
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                      >
                        Open public profile
                        <FaBookReader />
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
