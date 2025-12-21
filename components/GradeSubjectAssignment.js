"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FaChalkboardTeacher, FaCheckCircle } from "react-icons/fa";

export default function GradeSubjectAssignment({ grade, isOpen, onClose }) {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    if (isOpen && grade) {
      fetchData();
    }
  }, [isOpen, grade]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Curriculum Structure (Subjects for this grade)
      const structRes = await fetch("/api/school/curriculum/structure");
      const structData = await structRes.json();
      
      const gradeStructure = structData.structures.find(s => s.type === 'GRADE');
      const gradeData = gradeStructure?.items.find(g => g.name === grade);
      const gradeSubjects = gradeData ? gradeData.subjects : [];
      
      // Filter only active subjects
      const activeSubjects = gradeSubjects.filter(s => s.linkStatus === 'ACTIVE');
      setSubjects(activeSubjects);

      // Fetch Teachers
      const teachersRes = await fetch("/api/teachers");
      const teachersData = await teachersRes.json();
      setTeachers(teachersData.teachers || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (subjectId, teacherId) => {
    setSaving(prev => ({ ...prev, [subjectId]: true }));
    try {
      const res = await fetch("/api/school/curriculum/update-subject-link", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeId: grade,
          subjectId: subjectId,
          assignedTeacher: teacherId || null // Send null if unassigned
        }),
      });

      if (res.ok) {
        // Update local state
        setSubjects(prev => prev.map(s => 
          s._id === subjectId 
            ? { ...s, assignedTeacher: teachers.find(t => t._id === teacherId) || null }
            : s
        ));
      }
    } catch (error) {
      console.error("Error assigning teacher:", error);
    } finally {
      setSaving(prev => ({ ...prev, [subjectId]: false }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Teachers - ${grade}`}
    >
      {loading ? (
        <div className="flex justify-center p-8">
            <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {subjects.length === 0 ? (
              <div className="text-center text-slate-400 py-8 bg-slate-800/30 rounded-xl border border-slate-800">
                <FaChalkboardTeacher className="mx-auto text-4xl mb-3 opacity-30" />
                <p>No active subjects found for this grade.</p>
                <p className="text-sm mt-1">Please configure curriculum first.</p>
              </div>
            ) : (
              subjects.map((subject) => (
                <div 
                  key={subject._id} 
                  className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-600 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        {subject.name}
                        {subject.assignedTeacher && (
                            <FaCheckCircle className="text-emerald-500 text-xs" title="Teacher Assigned" />
                        )}
                    </h3>
                    <p className="text-xs text-slate-400">{subject.code || 'No Code'} • {subject.creditHours} Credit Hours</p>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <select
                        value={subject.assignedTeacher?._id || ""}
                        onChange={(e) => handleAssignTeacher(subject._id, e.target.value)}
                        disabled={saving[subject._id]}
                        className="w-full bg-slate-900 text-white text-sm rounded-lg border border-slate-600 px-3 py-2 pr-8 focus:border-emerald-500 outline-none appearance-none transition-colors"
                      >
                        <option value="">-- Select Teacher --</option>
                        {teachers.map((teacher) => (
                          <option key={teacher._id} value={teacher._id}>
                            {teacher.name} ({teacher.subject || 'General'})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <FaChalkboardTeacher />
                      </div>
                    </div>
                    {saving[subject._id] && (
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
