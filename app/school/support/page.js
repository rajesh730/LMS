"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import SupportTicketManager from "@/components/support/SupportTicketManager";
import { FaHeadset } from "react-icons/fa";

export default function SchoolSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="text-center text-slate-400">Loading...</div>
      </DashboardLayout>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (session?.user.role !== "SCHOOL_ADMIN") {
    router.push("/");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FaHeadset className="text-blue-400" /> Support Center
          </h1>
          <p className="text-slate-400">
            Manage your support requests and track responses from our team
          </p>
        </div>

        <SupportTicketManager />
      </div>
    </DashboardLayout>
  );
}
