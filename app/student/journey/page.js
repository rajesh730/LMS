"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FaGraduationCap } from "react-icons/fa";
import StudentHistory from "@/components/student/StudentHistory";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";

export default function StudentJourneyPage() {
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
          title="Opening your journey"
          message="Loading your schools, achievements, and writing history."
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
          message="Please sign in with a student account to view your journey."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          icon={FaGraduationCap}
          eyebrow="Student"
          title="My Journey"
          description="Your full record across every school and academic year — schools, achievements, and published writing."
        />
        <div className="mt-6">
          <StudentHistory />
        </div>
      </div>
    </DashboardLayout>
  );
}
