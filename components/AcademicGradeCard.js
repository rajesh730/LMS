"use client";

import Link from "next/link";
import { FaGraduationCap, FaChevronRight } from "react-icons/fa";

export default function AcademicGradeCard({ grade, studentCount = 0, onManageGrade, onAssignTeachers }) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <FaGraduationCap className="text-blue-400 text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Grade {grade}</h3>
            <p className="text-sm text-slate-400">{studentCount} Students</p>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-slate-700/40 rounded-lg">
        <p className="text-xs text-slate-300 uppercase tracking-wide font-semibold">
          Academic Management
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => onManageGrade && onManageGrade(grade)}
          className="flex items-center justify-between w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 group"
        >
          <span>Manage Grade</span>
          <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
        </button>
        
        <button
          onClick={() => onAssignTeachers && onAssignTeachers(grade)}
          className="flex items-center justify-between w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all duration-200 group"
        >
          <span>Curriculum & Teachers</span>
          <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
