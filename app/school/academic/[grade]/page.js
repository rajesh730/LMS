"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import GradeStudentsList from "@/components/GradeStudentsList";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  FaArrowLeft,
  FaUsers,
  FaBook,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function GradeDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const grade = params?.grade;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    if (session?.user?.role !== "SCHOOL_ADMIN") {
      router.push("/school/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!grade) return;

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/students/by-grade/${grade}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch students");
        }

        const data = await response.json();
        setStudents(data.data?.students || []);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError(err.message || "Failed to load students");
      } finally {
        setLoading(false);
      }
    };

    if (grade) {
      fetchStudents();
    }
  }, [grade]);

  const handleGoBack = () => {
    router.push("/school/academic");
  };

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Go Back Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg transition-all duration-200 border border-slate-700 hover:border-slate-600"
            >
              <FaArrowLeft className="text-lg" />
              <span className="font-semibold">Go Back</span>
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FaBook className="text-blue-400 text-lg" />
                </div>
                <h1 className="text-3xl font-bold text-slate-100">
                  Grade {grade}
                </h1>
              </div>
              <p className="text-slate-400">
                Manage and view all students in this grade
              </p>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg px-6 py-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <FaUsers className="text-emerald-400 text-lg" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Students</p>
              <p className="text-2xl font-bold text-slate-100">
                {students.length}
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <FaExclamationTriangle className="text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-400">Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Students List */}
        <GradeStudentsList students={students} grade={grade} />

        {/* Empty State */}
        {students && students.length === 0 && !error && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <FaUsers className="text-4xl text-slate-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No Students in Grade {grade}
            </h3>
            <p className="text-slate-400">
              Register students to this grade to see them listed here.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
