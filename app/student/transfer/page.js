"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FaExchangeAlt } from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import StudentTransferRequestPanel from "@/components/student/StudentTransferRequestPanel";

export default function StudentTransferPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [router, status]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState
          title="Opening transfer"
          message="Preparing your transfer request and code status."
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
          message="Please sign in with a student account to request a transfer."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          icon={FaExchangeAlt}
          eyebrow="Student transfer"
          title="Transfer"
          description="Request release from your current school, view your transfer code, and choose the school you are joining."
        />
        <div className="mt-5">
          <StudentTransferRequestPanel />
        </div>
      </div>
    </DashboardLayout>
  );
}
