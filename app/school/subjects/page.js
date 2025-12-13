"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import SchoolSubjectManager from "@/components/SchoolSubjectManager";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FaBook, FaArrowLeft } from "react-icons/fa";

export default function SchoolSubjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "SCHOOL_ADMIN") {
      router.push("/unauthorized");
    } else {
      setLoading(false);
    }
  }, [status, session, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400"
                title="Go back"
              >
                <FaArrowLeft />
              </button>
              <FaBook className="text-green-400 text-2xl" />
              <h1 className="text-3xl font-bold text-white">School Subjects</h1>
            </div>
            <p className="text-slate-400 ml-11">
              Manage your school's subjects (global + custom)
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <SchoolSubjectManager />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
