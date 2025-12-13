"use client";

import { FaEnvelope, FaPhone, FaUser } from "react-icons/fa";

export default function GradeStudentsList({ students, grade }) {
  if (!students || students.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <p className="text-slate-400">No students found in Grade {grade}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {students.map((student) => (
        <div
          key={student._id}
          className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-5 hover:border-blue-500/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaUser className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100">{student.name}</h4>
                  <p className="text-sm text-slate-400">
                    Roll No: {student.rollNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {student.email && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <FaEnvelope className="text-blue-400 flex-shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                )}

                {student.phone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <FaPhone className="text-emerald-400 flex-shrink-0" />
                    <span>{student.phone}</span>
                  </div>
                )}

                {student.parentName && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <FaUser className="text-orange-400 flex-shrink-0" />
                    <span>Parent: {student.parentName}</span>
                  </div>
                )}

                {student.parentContactNumber && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <FaPhone className="text-purple-400 flex-shrink-0" />
                    <span>{student.parentContactNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-emerald-400">ACTIVE</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
