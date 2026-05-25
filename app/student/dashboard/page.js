"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FaBell, FaGraduationCap } from "react-icons/fa";
import StudentActivityOverview from "@/components/student/StudentActivityOverview";
import StudentDailyOverview from "@/components/student/StudentDailyOverview";
import StudentNotificationCenter from "@/components/student/StudentNotificationCenter";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState
          title="Opening student dashboard"
          message="Loading notices, events, writing tasks, and achievements."
          className="min-h-[70vh]"
        />
      </DashboardLayout>
    );
  }

  if (session?.user?.role !== "STUDENT") {
    return (
      <DashboardLayout>
        <AlertBanner
          type="error"
          title="Student access required"
          message="Please sign in with a student account to open this dashboard."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          icon={FaGraduationCap}
          eyebrow="Student home"
          title="Your activity dashboard"
          description="Start with today's updates, then explore achievements, certificates, school notices, writing tasks, and magazine articles from one simple place."
          action={<StudentNotificationCenter />}
          meta={
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7cdbb] bg-[#eaf2ff] px-3 py-2 text-xs font-semibold text-[#0a2f66]">
              <FaBell className="text-[#0a2f66]" />
              Notices and event updates are kept in the left menu.
            </div>
          }
        />

        <div className="mt-8">
          <StudentDailyOverview />
        </div>

        <div className="mt-8">
          <StudentActivityOverview />
        </div>
      </div>
    </DashboardLayout>
  );
}
