"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import GradeSubjectAssignment from "@/components/GradeSubjectAssignment";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FaGraduationCap, FaArrowLeft } from "react-icons/fa";

export default function GradeSubjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const grade = params.grade ? decodeURIComponent(params.grade) : "";
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
              <FaGraduationCap className="text-purple-400 text-2xl" />
              <h1 className="text-3xl font-bold text-white">
                {grade} - Subject Management
              </h1>
            </div>
            <p className="text-slate-400 ml-11">
              Activate and manage subjects for this grade
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <GradeSubjectAssignment grade={grade} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
