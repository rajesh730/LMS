"use client";

import { useEffect, useState } from "react";
import AcademicGradeCard from "@/components/AcademicGradeCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import GradeDetailView from "@/components/dashboard/GradeDetailView";
import { FaBook, FaExclamationTriangle } from "react-icons/fa";

export default function AcademicSection() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentCounts, setStudentCounts] = useState({});
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [initialTab, setInitialTab] = useState("students");

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

    fetchGrades();
  }, []);

  const handleManageGrade = (grade) => {
    setSelectedGrade(grade);
    setInitialTab("students");
  };

  const handleAssignTeachers = (grade) => {
    setSelectedGrade(grade);
    setInitialTab("curriculum");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (selectedGrade) {
    return (
      <GradeDetailView 
        grade={selectedGrade} 
        onBack={() => setSelectedGrade(null)} 
        initialTab={initialTab}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <FaBook className="text-blue-400 text-lg" />
          </div>
          <h2 className="text-2xl font-bold text-white">Academic Management</h2>
        </div>
        <p className="text-slate-400">
          Manage grades and view student information
        </p>
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
                onManageGrade={handleManageGrade}
                onAssignTeachers={handleAssignTeachers}
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
  );
}
