"use client";

import { useState, useEffect } from "react";
import { FaSave, FaSearch, FaSpinner } from "react-icons/fa";
import { useNotification } from "@/components/NotificationSystem";

export default function BulkMarksEntry({ subjects = [], grades = [] }) {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useNotification();

  // Fetch Exams on mount
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch("/api/exams?status=ONGOING"); // Or fetch all and filter
        if (res.ok) {
          const data = await res.json();
          // Also include UPCOMING or PUBLISHED if needed, but usually marks are entered for ONGOING/UPCOMING
          setExams(data);
        }
      } catch (err) {
        console.error("Error fetching exams:", err);
      }
    };
    fetchExams();
  }, []);

  const fetchStudentsAndMarks = async () => {
    if (!selectedExam || !selectedGrade || !selectedSubject) {
      showError("Please select Exam, Grade, and Subject");
      return;
    }

    setLoading(true);
    try {
      const query = new URLSearchParams({
        examId: selectedExam,
        gradeId: selectedGrade,
        subjectId: selectedSubject,
      });

      const res = await fetch(`/api/marks/bulk?${query}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      } else {
        const err = await res.json();
        showError(err.error || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching marks:", err);
      showError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (index, field, value) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        examId: selectedExam,
        gradeId: selectedGrade,
        subjectId: selectedSubject,
        marks: students.map(s => ({
          studentId: s.studentId,
          marksObtained: s.marksObtained,
          totalMarks: s.totalMarks,
          remarks: s.remarks
        }))
      };

      const res = await fetch("/api/marks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        success("Marks saved successfully");
      } else {
        const err = await res.json();
        showError(err.error || "Failed to save marks");
      }
    } catch (err) {
      showError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  // Helper to fill total marks for all
  const fillTotalMarks = (value) => {
    const updated = students.map(s => ({ ...s, totalMarks: value }));
    setStudents(updated);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam</label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="w-full p-2 border rounded-md bg-gray-50"
          >
            <option value="">Select Exam</option>
            {exams.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-2 border rounded-md bg-gray-50"
          >
            <option value="">Select Grade</option>
            {grades.map((grade) => (
              <option key={grade._id || grade.id} value={grade._id || grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2 border rounded-md bg-gray-50"
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject._id || subject.id} value={subject._id || subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchStudentsAndMarks}
          disabled={loading || !selectedExam || !selectedGrade || !selectedSubject}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
          Load Students
        </button>
      </div>

      {students.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Marks Entry ({students.length} Students)
            </h3>
            <div className="flex items-center gap-2">
               <span className="text-sm text-gray-500">Set Total Marks for All:</span>
               <input 
                 type="number" 
                 className="w-20 p-1 border rounded text-sm"
                 placeholder="100"
                 onChange={(e) => fillTotalMarks(e.target.value)}
               />
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-3">Roll No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3 w-32">Marks Obtained</th>
                  <th className="px-4 py-3 w-32">Total Marks</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student, index) => (
                  <tr key={student.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{student.rollNumber}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={student.marksObtained}
                        onChange={(e) => handleMarkChange(index, "marksObtained", e.target.value)}
                        className="w-full p-1 border rounded focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={student.totalMarks}
                        onChange={(e) => handleMarkChange(index, "totalMarks", e.target.value)}
                        className="w-full p-1 border rounded focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={student.remarks}
                        onChange={(e) => handleMarkChange(index, "remarks", e.target.value)}
                        className="w-full p-1 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Save Marks
            </button>
          </div>
        </div>
      )}
      
      {students.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          Select criteria and click "Load Students" to start entering marks.
        </div>
      )}
    </div>
  );
}
