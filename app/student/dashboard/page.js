"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ParentDashboard from "@/components/ParentDashboard";
import ParentModeToggle from "@/components/ParentModeToggle";
import { ParentModeProvider, useParentMode } from "@/context/ParentModeContext";
import { FaGraduationCap } from "react-icons/fa";
import StudentTalentWorkspace from "@/components/student/StudentTalentWorkspace";

// Inner component to use the context
function DashboardContent() {
  const { isParentMode } = useParentMode();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
          {isParentMode ? (
            <>
              <span className="text-purple-400">Parent</span> Dashboard
            </>
          ) : (
            <>
              <FaGraduationCap className="text-blue-400" /> Student Dashboard
            </>
          )}
        </h1>
        
        <ParentModeToggle />
      </div>

      {isParentMode ? (
        <ParentDashboard />
      ) : (
        <StudentTalentWorkspace />
      )}
    </div>
  );
}

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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-slate-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (session?.user?.role !== "STUDENT") {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-400">Unauthorized access</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ParentModeProvider>
        <DashboardContent />
      </ParentModeProvider>
    </DashboardLayout>
  );
}
