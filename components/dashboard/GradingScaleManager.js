"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import { useNotification } from "@/components/NotificationSystem";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function GradingScaleManager() {
  const [scales, setScales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState(null);
  const { success, error: showError } = useNotification();

  const [formData, setFormData] = useState({
    name: "",
    ranges: [],
    isDefault: false,
  });

  // Default ranges template
  const defaultRanges = [
    { minPercentage: 90, maxPercentage: 100, grade: "A+", gpa: 4.0, description: "Outstanding" },
    { minPercentage: 80, maxPercentage: 90, grade: "A", gpa: 3.6, description: "Excellent" },
    { minPercentage: 70, maxPercentage: 80, grade: "B+", gpa: 3.2, description: "Very Good" },
    { minPercentage: 60, maxPercentage: 70, grade: "B", gpa: 2.8, description: "Good" },
    { minPercentage: 50, maxPercentage: 60, grade: "C+", gpa: 2.4, description: "Satisfactory" },
    { minPercentage: 40, maxPercentage: 50, grade: "C", gpa: 2.0, description: "Acceptable" },
    { minPercentage: 0, maxPercentage: 40, grade: "D", gpa: 0.0, description: "Insufficient" },
  ];

  useEffect(() => {
    fetchScales();
  }, []);

  const fetchScales = async () => {
    try {
      const res = await fetch("/api/grading-scales");
      if (res.ok) {
        const data = await res.json();
        setScales(data);
      }
    } catch (err) {
      console.error("Error fetching scales:", err);
      showError("Failed to load grading scales");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Check for overlaps or gaps? 
    // For now, basic validation
    if (formData.ranges.length === 0) {
        showError("Please add at least one grade range");
        return;
    }

    try {
      const url = editingScale ? `/api/grading-scales/${editingScale._id}` : "/api/grading-scales";
      const method = editingScale ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        success(editingScale ? "Scale updated successfully" : "Scale created successfully");
        setIsModalOpen(false);
        fetchScales();
        resetForm();
      } else {
        const data = await res.json();
        showError(data.error || "Operation failed");
      }
    } catch (err) {
      showError("An error occurred");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this grading scale?")) return;

    try {
      const res = await fetch(`/api/grading-scales/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        success("Scale deleted successfully");
        fetchScales();
      } else {
        showError("Failed to delete scale");
      }
    } catch (err) {
      showError("An error occurred");
    }
  };

  const resetForm = () => {
    setEditingScale(null);
    setFormData({
      name: "",
      ranges: defaultRanges, // Pre-fill with template for convenience
      isDefault: false,
    });
  };

  const openEditModal = (scale) => {
    setEditingScale(scale);
    setFormData({
      name: scale.name,
      ranges: scale.ranges,
      isDefault: scale.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleRangeChange = (index, field, value) => {
    const newRanges = [...formData.ranges];
    newRanges[index][field] = value;
    setFormData({ ...formData, ranges: newRanges });
  };

  const addRange = () => {
    setFormData({
      ...formData,
      ranges: [...formData.ranges, { minPercentage: 0, maxPercentage: 0, grade: "", gpa: 0, description: "" }]
    });
  };

  const removeRange = (index) => {
    const newRanges = formData.ranges.filter((_, i) => i !== index);
    setFormData({ ...formData, ranges: newRanges });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Grading Scales</h2>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FaPlus /> Create Scale
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scales.map((scale) => (
            <div key={scale._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{scale.name}</h3>
                  {scale.isDefault && (
                    <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full mt-1">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(scale)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(scale._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">{scale.ranges.length} Grade Ranges Defined</p>
                <div className="text-xs text-gray-400">
                    Example: {scale.ranges[0]?.grade} ({scale.ranges[0]?.minPercentage}-{scale.ranges[0]?.maxPercentage}%)
                </div>
              </div>
            </div>
          ))}
          
          {scales.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              No grading scales found. Create one to automate grading.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingScale ? "Edit Grading Scale" : "Create Grading Scale"}
        maxWidth="4xl" // Wider modal for the table
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scale Name</label>
                <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded-md"
                placeholder="e.g., Standard GPA System"
                />
            </div>
            <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Set as Default Scale</span>
                </label>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Grade Ranges</label>
                <button type="button" onClick={addRange} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <FaPlus /> Add Range
                </button>
            </div>
            
            <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th className="px-4 py-2">Grade</th>
                            <th className="px-4 py-2">Min %</th>
                            <th className="px-4 py-2">Max %</th>
                            <th className="px-4 py-2">GPA</th>
                            <th className="px-4 py-2">Description</th>
                            <th className="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {formData.ranges.map((range, index) => (
                            <tr key={index}>
                                <td className="p-2">
                                    <input 
                                        type="text" 
                                        value={range.grade}
                                        onChange={(e) => handleRangeChange(index, 'grade', e.target.value)}
                                        className="w-full p-1 border rounded"
                                        placeholder="A+"
                                        required
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        value={range.minPercentage}
                                        onChange={(e) => handleRangeChange(index, 'minPercentage', e.target.value)}
                                        className="w-full p-1 border rounded"
                                        required
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        value={range.maxPercentage}
                                        onChange={(e) => handleRangeChange(index, 'maxPercentage', e.target.value)}
                                        className="w-full p-1 border rounded"
                                        required
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={range.gpa}
                                        onChange={(e) => handleRangeChange(index, 'gpa', e.target.value)}
                                        className="w-full p-1 border rounded"
                                        required
                                    />
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="text" 
                                        value={range.description}
                                        onChange={(e) => handleRangeChange(index, 'description', e.target.value)}
                                        className="w-full p-1 border rounded"
                                        placeholder="Excellent"
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <button 
                                        type="button" 
                                        onClick={() => removeRange(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <FaTimes />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingScale ? "Update Scale" : "Create Scale"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
