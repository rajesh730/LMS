"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AcademicGradeCard from "@/components/AcademicGradeCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FaBook, FaExclamationTriangle } from "react-icons/fa";

export default function AcademicPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentCounts, setStudentCounts] = useState({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    if (session?.user?.role !== "SCHOOL_ADMIN") {
      router.push("/school/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/schools/grades", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch grades");
        }

        const data = await response.json();
        setGrades(data.data?.grades || []);

        // Fetch student counts for each grade
        if (data.data?.grades && data.data.grades.length > 0) {
          const counts = {};
          for (const grade of data.data.grades) {
            try {
              const countResponse = await fetch(
                `/api/students/by-grade/${grade}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                }
              );

              if (countResponse.ok) {
                const countData = await countResponse.json();
                counts[grade] = countData.data?.totalStudents || 0;
              }
            } catch (err) {
              console.error(`Error fetching count for grade ${grade}:`, err);
              counts[grade] = 0;
            }
          }
          setStudentCounts(counts);
        }
      } catch (err) {
        console.error("Error fetching grades:", err);
        setError(err.message || "Failed to load grades");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchGrades();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FaBook className="text-blue-400 text-lg" />
              </div>
              <h1 className="text-3xl font-bold text-slate-100">Academic</h1>
            </div>
            <p className="text-slate-400">
              Manage grades and view student information
            </p>
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

        {/* Grades Grid */}
        {grades && grades.length > 0 ? (
          <div>
            <div className="mb-4">
              <p className="text-slate-400 text-sm">
                Total Grades: <span className="font-bold text-slate-100">{grades.length}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {grades.map((grade) => (
                <AcademicGradeCard
                  key={grade}
                  grade={grade}
                  studentCount={studentCounts[grade] || 0}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <FaBook className="text-4xl text-slate-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No Grades Configured
            </h3>
            <p className="text-slate-400">
              Please configure grades in school settings to start managing academic data.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
