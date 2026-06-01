"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import TeacherEventOperations from "@/components/teacher/TeacherEventOperations";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import { FaChalkboardTeacher } from "react-icons/fa";

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState
          title="Opening mentor workspace"
          message="Loading assigned events and students."
          className="min-h-[70vh]"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          icon={FaChalkboardTeacher}
          eyebrow="Mentor"
          title="Workspace"
          description={`${session?.user?.name || "Mentor"}, manage assigned events and student participation from here.`}
        />

        <div className="mt-6">
          <TeacherEventOperations />
        </div>
      </div>
    </DashboardLayout>
  );
}
