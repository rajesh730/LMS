"use client";

import { useState, useEffect } from "react";
import { FaArrowLeft, FaUserGraduate, FaBook, FaChalkboardTeacher, FaPhone, FaEnvelope } from "react-icons/fa";
import StudentManager from "./StudentManager";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import CurriculumManager from "@/components/CurriculumManager";

export default function GradeDetailView({ grade, onBack, initialTab = "students" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "curriculum") {
      fetchSubjects();
    }
  }, [activeTab, grade]);

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const res = await fetch("/api/school/curriculum/structure");
      if (res.ok) {
        const data = await res.json();
        const gradeStructure = data.structures.find(s => s.type === 'GRADE');
        // Fuzzy match for grade name (e.g. "1" vs "Grade 1")
        const gradeData = gradeStructure?.items.find(g => 
            g.name === grade || 
            g.name.replace(/\D/g, '') === grade.toString().replace(/\D/g, '')
        );
        
        if (gradeData) {
            // Filter only active subjects
            setSubjects(gradeData.subjects.filter(s => s.linkStatus === 'ACTIVE'));
        }
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
        >
            <FaArrowLeft />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-white">{grade} Dashboard</h2>
            <p className="text-slate-400 text-sm">Manage students, subjects, and teachers for this grade</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 pb-1">
        <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
                activeTab === "students"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
        >
            <div className="flex items-center gap-2">
                <FaUserGraduate />
                Students
            </div>
            {activeTab === "students" && (
                <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></span>
            )}
        </button>
        <button
            onClick={() => setActiveTab("curriculum")}
            className={`px-4 py-2 text-sm font-medium transition relative ${
                activeTab === "curriculum"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-white"
            }`}
        >
            <div className="flex items-center gap-2">
                <FaChalkboardTeacher />
                Curriculum & Teachers
            </div>
            {activeTab === "curriculum" && (
                <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></span>
            )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "students" && (
            <StudentManager initialGrade={grade} hideGradeFilter={true} />
        )}

        {activeTab === "curriculum" && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Subject & Teacher Mapping</h3>
                        <p className="text-sm text-slate-400">Overview of subjects and assigned faculty</p>
                    </div>
                    <button
                        onClick={() => setIsCurriculumModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Manage Curriculum
                    </button>
                </div>

                {loadingSubjects ? (
                    <div className="flex justify-center p-12">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                                <tr>
                                    <th className="p-4">Subject Details</th>
                                    <th className="p-4">Assigned Teacher</th>
                                    <th className="p-4">Teacher Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {subjects.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-slate-500">
                                            No subjects configured. Click "Manage Curriculum" to add subjects.
                                        </td>
                                    </tr>
                                ) : (
                                    subjects.map((subject) => (
                                        <tr key={subject._id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    <FaBook className="text-blue-400" />
                                                    {subject.name}
                                                </div>
                                                <div className="text-xs text-slate-500 ml-6">
                                                    Code: {subject.code} • Credits: {subject.creditHours}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {subject.assignedTeacher ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                            {subject.assignedTeacher.name.charAt(0)}
                                                        </div>
                                                        <span className="text-white font-medium">{subject.assignedTeacher.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {subject.assignedTeacher ? (
                                                    <div className="space-y-1">
                                                        {subject.assignedTeacher.email && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <FaEnvelope className="text-slate-600" />
                                                                {subject.assignedTeacher.email}
                                                            </div>
                                                        )}
                                                        {subject.assignedTeacher.phone && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <FaPhone className="text-slate-600" />
                                                                {subject.assignedTeacher.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Curriculum Manager Modal */}
      <Modal
        isOpen={isCurriculumModalOpen}
        onClose={() => {
            setIsCurriculumModalOpen(false);
            fetchSubjects(); // Refresh data on close
        }}
        title={`Manage Curriculum - ${grade}`}
      >
        <div className="min-h-[600px]">
            <CurriculumManager initialGrade={grade} />
        </div>
      </Modal>
    </div>
  );
}
