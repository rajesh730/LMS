"use client";

import { useState, useEffect } from "react";
import { FaFileAlt, FaSpinner, FaArrowLeft } from "react-icons/fa";
import StudentReportCard from "@/components/StudentReportCard";

export default function StudentResultsView() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    fetchPublishedExams();
  }, []);

  const fetchPublishedExams = async () => {
    try {
      // Fetch exams that are PUBLISHED
      const res = await fetch("/api/exams?status=PUBLISHED");
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  };

  const viewResult = async (examId) => {
    setLoadingResult(true);
    try {
      const res = await fetch(`/api/student/results?examId=${examId}`);
      if (res.ok) {
        const data = await res.json();
        setResultData(data);
        setSelectedExam(examId);
      } else {
        alert("Failed to load results");
      }
    } catch (err) {
      console.error("Error fetching result:", err);
    } finally {
      setLoadingResult(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading exams...</div>;

  if (selectedExam && resultData) {
    return (
      <div>
        <button 
          onClick={() => { setSelectedExam(null); setResultData(null); }}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <FaArrowLeft /> Back to Exam List
        </button>
        <StudentReportCard data={resultData} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => (
        <div 
          key={exam._id} 
          className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition cursor-pointer group"
          onClick={() => viewResult(exam._id)}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition">
              <FaFileAlt className="text-2xl text-blue-400" />
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
              Published
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">{exam.name}</h3>
          <p className="text-slate-400 text-sm mb-4">
            {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
          </p>
          
          <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-700 pt-4">
            <span>{exam.term.replace('_', ' ')}</span>
            <span className="group-hover:text-blue-400 transition flex items-center gap-1">
              View Report {loadingResult && selectedExam === exam._id && <FaSpinner className="animate-spin" />}
            </span>
          </div>
        </div>
      ))}

      {exams.length === 0 && (
        <div className="col-span-full text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
          No results published yet.
        </div>
      )}
    </div>
  );
}
