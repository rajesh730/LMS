"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FaGraduationCap } from "react-icons/fa";
import StudentActivityOverview from "@/components/student/StudentActivityOverview";
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
          eyebrow="Student"
          title="Dashboard"
          description="See your activity, notices, events, writing, and achievements from one place."
          action={<StudentNotificationCenter />}
        />

        <div className="mt-6">
          <StudentActivityOverview />
        </div>
      </div>
    </DashboardLayout>
  );
}
