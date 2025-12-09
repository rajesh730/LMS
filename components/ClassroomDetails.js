"use client";

import { useState, useEffect } from "react";
import {
  FaChalkboardTeacher,
  FaUserGraduate,
  FaBook,
  FaTimes,
} from "react-icons/fa";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";

/**
 * ClassroomDetails Component
 * Shows detailed information about a classroom:
 * - Student count and list
 * - Teacher assignments
 * - Subjects offered
 * - Capacity utilization
 */
export default function ClassroomDetails({ classroomId, onClose }) {
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClassroomDetails();
  }, [classroomId]);

  const fetchClassroomDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/classrooms/${classroomId}`);

      if (res.ok) {
        const data = await res.json();
        setClassroom(data.classroom);
        setError(null);
      } else {
        const err = await res.json();
        setError(err.message || "Failed to load classroom details");
      }
    } catch (err) {
      console.error("Error fetching classroom:", err);
      setError("Failed to load classroom details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-2xl">
          <LoadingSpinner text="Loading classroom details..." />
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-2xl">
          <button
            onClick={onClose}
            className="float-right text-slate-400 hover:text-white mb-4"
          >
            <FaTimes className="text-2xl" />
          </button>
          <EmptyState
            title="Error Loading Classroom"
            description={error || "Classroom not found"}
          />
        </div>
      </div>
    );
  }

  const capacityPercentage = classroom.studentCount
    ? Math.round((classroom.studentCount / classroom.capacity) * 100)
    : 0;
  const capacityStatus =
    capacityPercentage > 90
      ? "text-red-400"
      : capacityPercentage > 70
      ? "text-yellow-400"
      : "text-emerald-400";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">{classroom.name}</h2>
            <p className="text-slate-400 text-sm">Classroom Details</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded transition"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Capacity Indicator */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-medium">Capacity</span>
            <span className={`${capacityStatus} font-bold`}>
              {classroom.studentCount || 0}/{classroom.capacity}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                capacityPercentage > 90
                  ? "bg-red-500"
                  : capacityPercentage > 70
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
          <p className="text-slate-400 text-xs mt-2">
            {capacityPercentage}% full
          </p>
        </div>

        {/* Class Teacher */}
        {classroom.classTeacher && (
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FaChalkboardTeacher className="text-emerald-400" />
              <span className="text-slate-400 font-medium">Class Teacher</span>
            </div>
            <p className="text-white ml-6">
              {classroom.classTeacher.name || classroom.classTeacher}
            </p>
          </div>
        )}

        {/* Subjects */}
        {classroom.subjects && classroom.subjects.length > 0 && (
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FaBook className="text-blue-400" />
              <span className="text-slate-400 font-medium">Subjects</span>
            </div>
            <div className="grid grid-cols-2 gap-2 ml-6">
              {classroom.subjects.map((subject, i) => (
                <div key={i} className="bg-slate-900 p-2 rounded text-sm">
                  <p className="text-white">{subject.name || subject}</p>
                  {subject.code && (
                    <p className="text-slate-500 text-xs">{subject.code}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subject Teachers */}
        {classroom.subjectTeachers && classroom.subjectTeachers.length > 0 && (
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FaChalkboardTeacher className="text-purple-400" />
              <span className="text-slate-400 font-medium">
                Subject Teachers
              </span>
            </div>
            <div className="space-y-2 ml-6">
              {classroom.subjectTeachers.map((st, i) => (
                <div
                  key={i}
                  className="bg-slate-900 p-2 rounded text-sm flex justify-between"
                >
                  <p className="text-white">{st.teacher?.name || st.teacher}</p>
                  <p className="text-slate-400">{st.subject}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Count */}
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <FaUserGraduate className="text-blue-400" />
            <span className="text-slate-400 font-medium">
              Students Enrolled
            </span>
          </div>
          <p className="text-3xl font-bold text-white ml-6">
            {classroom.studentCount || 0}
          </p>
          <p className="text-slate-400 text-xs ml-6">
            {classroom.capacity - (classroom.studentCount || 0)} seats available
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
