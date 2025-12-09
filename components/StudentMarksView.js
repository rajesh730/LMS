"use client";

import { useState, useEffect } from "react";
import { FaAward, FaTrophy, FaChartLine } from "react-icons/fa";
import { useSession } from "next-auth/react";

export default function StudentMarksView() {
  const { data: session } = useSession();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("");
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marks");
      if (res.ok) {
        const data = await res.json();
        const studentMarks = data.data || data;
        setMarks(studentMarks);

        // Extract unique subjects
        const uniqueSubjects = [
          ...new Set(studentMarks.map((m) => m.subject._id)),
        ].map((id) => studentMarks.find((m) => m.subject._id === id).subject);
        setSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error("Error fetching marks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A+":
      case "A":
        return "text-emerald-400 bg-emerald-500/10";
      case "B+":
      case "B":
        return "text-blue-400 bg-blue-500/10";
      case "C+":
      case "C":
        return "text-yellow-400 bg-yellow-500/10";
      case "D+":
      case "D":
        return "text-orange-400 bg-orange-500/10";
      default:
        return "text-red-400 bg-red-500/10";
    }
  };

  const calculateStats = (marksToCalculate) => {
    if (marksToCalculate.length === 0)
      return { avgPercentage: 0, bestGrade: "-", totalMarks: 0 };

    const avgPercentage = Math.round(
      marksToCalculate.reduce((sum, m) => sum + m.percentage, 0) /
        marksToCalculate.length
    );
    const grades = ["A+", "A", "B+", "B", "C+", "C", "D+", "D", "E", "F"];
    const bestGrade = marksToCalculate.reduce((best, m) => {
      return grades.indexOf(m.grade) < grades.indexOf(best.grade) ? m : best;
    }).grade;

    return { avgPercentage, bestGrade, totalMarks: marksToCalculate.length };
  };

  const filteredMarks = filterSubject
    ? marks.filter((m) => m.subject._id === filterSubject)
    : marks;

  // Calculate stats based on filtered marks
  const stats = calculateStats(filteredMarks);

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">
        Loading your marks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaAward className="text-purple-400" /> My Marks & Grades
        </h3>

        {/* Filter */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-slate-300 font-semibold mb-2">
              Filter by Subject
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {marks.length === 0 ? (
        <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 border-dashed text-center">
          <FaChartLine className="text-4xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No marks recorded yet</p>
          <p className="text-slate-500 text-sm mt-2">
            Your teachers will add marks as they conduct assessments
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm font-semibold mb-2">
                Average Percentage
              </p>
              <p className="text-3xl font-bold text-blue-400">
                {stats.avgPercentage}%
              </p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm font-semibold mb-2">
                Best Grade
              </p>
              <p className="text-3xl font-bold text-emerald-400">
                {stats.bestGrade}
              </p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm font-semibold mb-2">
                Total Assessments
              </p>
              <p className="text-3xl font-bold text-purple-400">
                {stats.totalMarks}
              </p>
            </div>
          </div>

          {/* Marks Table */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                    Subject
                  </th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                    Assessment
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Marks
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    %
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Grade
                  </th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                    Feedback
                  </th>
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMarks.map((mark) => (
                  <tr
                    key={mark._id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">
                        {mark.subject.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {mark.subject.code}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">
                        {mark.assessmentName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {mark.assessmentType}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-white font-semibold">
                      {mark.marksObtained}/{mark.totalMarks}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-400">
                      {mark.percentage}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(
                          mark.grade
                        )}`}
                      >
                        {mark.grade}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate"
                      title={mark.feedback || ""}
                    >
                      {mark.feedback || "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {new Date(mark.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Insights */}
          <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-xl">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <FaTrophy className="text-blue-400" /> Performance Insights
            </h4>
            <ul className="space-y-2 text-blue-400 text-sm">
              {stats.avgPercentage >= 80 && (
                <li>✓ Excellent performance! Keep up the great work.</li>
              )}
              {stats.avgPercentage >= 60 && stats.avgPercentage < 80 && (
                <li>✓ Good performance. Focus on improving weak areas.</li>
              )}
              {stats.avgPercentage < 60 && (
                <li>
                  ⚠ Need improvement. Consider seeking additional help from your
                  teachers.
                </li>
              )}
              <li>Total Assessments: {filteredMarks.length}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
