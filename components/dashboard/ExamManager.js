"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt } from "react-icons/fa";
import { useNotification } from "@/components/NotificationSystem";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ExamManager() {
  const [exams, setExams] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const { success, error: showError } = useNotification();

  const [formData, setFormData] = useState({
    name: "",
    academicYear: "",
    term: "FIRST_TERM",
    startDate: "",
    endDate: "",
    weightage: 100,
    description: "",
    status: "UPCOMING",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchExams(selectedYear);
    }
  }, [selectedYear]);

  const fetchInitialData = async () => {
    try {
      const yearRes = await fetch("/api/school/academic-years");
      if (yearRes.ok) {
        const data = await yearRes.json();
        const yearsList = data.years || [];
        
        // Filter: Only show the Current Active year as per user request
        // This prevents creating exams for past/future years that shouldn't be accessed
        const validYears = yearsList.filter(y => y.isCurrent || y.status === 'ACTIVE' || y.status === 'active');
        
        setAcademicYears(validYears);
        
        // Find active year or default to first available
        const activeYear = validYears.find(y => y.status === 'ACTIVE' || y.status === 'active') || validYears[0];
        
        if (activeYear) {
          setSelectedYear(activeYear._id);
          setFormData(prev => ({ ...prev, academicYear: activeYear._id }));
        } else if (validYears.length > 0) {
          setSelectedYear(validYears[0]._id);
          setFormData(prev => ({ ...prev, academicYear: validYears[0]._id }));
        }
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
      showError("Failed to load academic years");
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async (yearId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams?academicYear=${yearId}`);
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error("Error fetching exams:", err);
      showError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingExam ? `/api/exams/${editingExam._id}` : "/api/exams";
      const method = editingExam ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        success(editingExam ? "Exam updated successfully" : "Exam created successfully");
        setIsModalOpen(false);
        fetchExams(selectedYear);
        resetForm();
      } else {
        showError(data.error || "Operation failed");
      }
    } catch (err) {
      showError("An error occurred");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;

    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        success("Exam deleted successfully");
        fetchExams(selectedYear);
      } else {
        showError("Failed to delete exam");
      }
    } catch (err) {
      showError("An error occurred");
    }
  };

  const resetForm = () => {
    setEditingExam(null);
    setFormData({
      name: "",
      academicYear: selectedYear,
      term: "FIRST_TERM",
      startDate: "",
      endDate: "",
      weightage: 100,
      description: "",
      status: "UPCOMING",
    });
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      academicYear: exam.academicYear._id || exam.academicYear,
      term: exam.term,
      startDate: new Date(exam.startDate).toISOString().split('T')[0],
      endDate: new Date(exam.endDate).toISOString().split('T')[0],
      weightage: exam.weightage,
      description: exam.description || "",
      status: exam.status,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Exam Management</h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2 border border-slate-700 rounded-md bg-slate-800 text-white"
          >
            {academicYears.map((year) => (
              <option key={year._id} value={year._id}>
                {year.name} {(year.status === 'ACTIVE' || year.status === 'active') ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FaPlus /> Create Exam
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <div key={exam._id} className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{exam.name}</h3>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                    exam.status === 'PUBLISHED' ? 'bg-green-900/30 text-green-400' :
                    exam.status === 'ONGOING' ? 'bg-blue-900/30 text-blue-400' :
                    exam.status === 'COMPLETED' ? 'bg-slate-700 text-slate-300' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {exam.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(exam)}
                    className="p-2 text-blue-400 hover:bg-slate-700 rounded-full"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(exam._id)}
                    className="p-2 text-red-400 hover:bg-slate-700 rounded-full"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-slate-400" />
                  <span>
                    {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                  </span>
                </div>
                <p>Term: {exam.term.replace('_', ' ')}</p>
                <p>Weightage: {exam.weightage}%</p>
                {exam.description && <p className="text-slate-400 mt-2">{exam.description}</p>}
              </div>
            </div>
          ))}
          
          {exams.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
              No exams found for this academic year. Create one to get started.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? "Edit Exam" : "Create New Exam"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Exam Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white placeholder-slate-400"
              placeholder="e.g., First Term Examination 2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Term</label>
              <select
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white"
              >
                <option value="FIRST_TERM">First Term</option>
                <option value="SECOND_TERM">Second Term</option>
                <option value="THIRD_TERM">Third Term</option>
                <option value="FINAL_TERM">Final Term</option>
                <option value="UNIT_TEST">Unit Test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Weightage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.weightage}
                onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
                className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white"
            >
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="PUBLISHED">Published (Results Visible)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border border-slate-600 rounded-md bg-slate-700 text-white"
              rows="3"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingExam ? "Update Exam" : "Create Exam"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
