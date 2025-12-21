"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FaCalendarAlt, FaPlus, FaCheckCircle, FaHistory, FaArrowRight, FaUserGraduate, FaEye, FaEyeSlash, FaTrash } from "react-icons/fa";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import StudentPromotionManager from "@/components/dashboard/StudentPromotionManager";

export default function AcademicYearManager() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  
  // Super Admin: Create Year State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newYearData, setNewYearData] = useState({ name: "", startDate: "", endDate: "", isPublished: false });
  const [creating, setCreating] = useState(false);

  // History Viewing
  const [viewingYear, setViewingYear] = useState(null);
  const [yearRecords, setYearRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (session) fetchYears();
  }, [session]);

  const fetchYears = async () => {
    try {
      const res = await fetch("/api/school/academic-years");
      if (res.ok) {
        const data = await res.json();
        setYears(data.years);
      }
    } catch (error) {
      console.error("Error fetching years:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/school/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newYearData),
      });
      
      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewYearData({ name: "", startDate: "", endDate: "", isPublished: false });
        fetchYears();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create year");
      }
    } catch (error) {
      console.error("Error creating year:", error);
      alert("Failed to create year");
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (year) => {
    try {
        const res = await fetch(`/api/school/academic-years/${year._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublished: !year.isPublished })
        });
        if (res.ok) fetchYears();
    } catch (error) {
        console.error("Error toggling publish:", error);
    }
  };

  const handleDeleteYear = async (id) => {
    if (!confirm("Are you sure you want to delete this academic year? This cannot be undone.")) return;
    try {
        const res = await fetch(`/api/school/academic-years/${id}`, { method: "DELETE" });
        if (res.ok) fetchYears();
    } catch (error) {
        console.error("Error deleting year:", error);
    }
  };

  const handleViewRecords = async (year) => {
    setViewingYear(year);
    setLoadingRecords(true);
    setYearRecords([]);
    try {
        const res = await fetch(`/api/school/academic-years/${year._id}/records`);
        if (res.ok) {
            const data = await res.json();
            setYearRecords(data.records || []);
        }
    } catch (error) {
        console.error("Error fetching records", error);
    } finally {
        setLoadingRecords(false);
    }
  };

  const handleActivate = async (id) => {
    if (!confirm("Are you sure? This will mark the current year as COMPLETED and this year as ACTIVE.")) return;
    
    try {
      const res = await fetch(`/api/school/academic-years/${id}/activate`, {
        method: "PUT",
      });
      if (res.ok) {
        fetchYears();
      } else {
        alert("Failed to activate year");
      }
    } catch (error) {
      console.error("Error activating year:", error);
    }
  };

  const currentYear = years.find(y => y.isCurrent);
  const upcomingYears = years.filter(y => !y.isCurrent && y.status === "UPCOMING");
  const pastYears = years.filter(y => !y.isCurrent && y.status !== "UPCOMING");

  if (loading) return <LoadingSpinner />;

  // Super Admin View: Simplified List
  if (isSuperAdmin) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-400" />
                  Global Academic Years
              </h2>
              <p className="text-slate-400 text-sm">Manage global academic sessions for all schools</p>
          </div>
          <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
              <FaPlus /> Create Global Year
          </button>
        </div>

        {/* Years List */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            {years.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">
                    No academic years found. Create one to get started.
                </div>
            ) : (
                <div className="divide-y divide-slate-800">
                    {years.map(year => (
                        <div key={year._id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-semibold text-white">{year.name}</h3>
                                    {!year.isPublished && (
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30 font-medium">
                                            DRAFT
                                        </span>
                                    )}
                                    {year.isPublished && (
                                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 font-medium">
                                            PUBLISHED
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-slate-400 flex items-center gap-4">
                                    <span>Start: {new Date(year.startDate).toLocaleDateString()}</span>
                                    <span>End: {new Date(year.endDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleTogglePublish(year)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        year.isPublished 
                                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                        : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                                    }`}
                                >
                                    {year.isPublished ? (
                                        <><FaEyeSlash /> Unpublish</>
                                    ) : (
                                        <><FaEye /> Publish</>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDeleteYear(year._id)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete Year"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Create Modal */}
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Global Academic Year">
            <form onSubmit={handleCreateYear} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Year Name</label>
                    <input 
                        type="text" 
                        required
                        placeholder="e.g., 2083, 2026-2027"
                        value={newYearData.name}
                        onChange={(e) => setNewYearData({...newYearData, name: e.target.value})}
                        className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                        <input 
                            type="date" 
                            required
                            value={newYearData.startDate}
                            onChange={(e) => setNewYearData({...newYearData, startDate: e.target.value})}
                            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                        <input 
                            type="date" 
                            required
                            value={newYearData.endDate}
                            onChange={(e) => setNewYearData({...newYearData, endDate: e.target.value})}
                            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox"
                        id="isPublished"
                        checked={newYearData.isPublished}
                        onChange={(e) => setNewYearData({...newYearData, isPublished: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isPublished" className="text-sm text-slate-300">Publish immediately (Visible to schools)</label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="px-4 py-2 text-slate-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={creating}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {creating ? "Creating..." : "Create Year"}
                    </button>
                </div>
            </form>
        </Modal>
      </div>
    );
  }

  // School Admin View (Original)
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaCalendarAlt className="text-blue-400" />
                Academic Years
            </h2>
            <p className="text-slate-400 text-sm">Manage school sessions and year-end transitions</p>
        </div>
        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-400 font-medium">
            Global System
        </div>
      </div>

      {/* Current Session Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <FaCalendarAlt size={100} />
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-400 font-bold mb-2 uppercase text-xs tracking-wider">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                Current Active Session
            </div>
            
            {currentYear ? (
                <div>
                    <h3 className="text-3xl font-bold text-white mb-1">{currentYear.name}</h3>
                    <div className="text-slate-400 text-sm mb-6">
                        {new Date(currentYear.startDate).toLocaleDateString()} - {new Date(currentYear.endDate).toLocaleDateString()}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsPromotionModalOpen(true)}
                            className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <FaUserGraduate /> Promote Students
                        </button>
                        {/* Only show "End Session" if there is an upcoming year to switch to */}
                        {upcomingYears.length > 0 && (
                            <button 
                                onClick={() => handleActivate(upcomingYears[0]._id)}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <FaArrowRight /> Switch to {upcomingYears[0].name}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-slate-400 py-4">
                    No active session found. Please create and activate a new academic year.
                </div>
            )}
        </div>
      </div>

      {/* Upcoming & Past Years */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaArrowRight className="text-slate-500" /> Upcoming Sessions
            </h3>
            <div className="space-y-3">
                {upcomingYears.length === 0 ? (
                    <div className="text-slate-500 text-sm italic">No upcoming sessions scheduled.</div>
                ) : (
                    upcomingYears.map(year => (
                        <div key={year._id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <div className="text-white font-medium flex items-center gap-2">
                                    {year.name}
                                    {isSuperAdmin && !year.isPublished && (
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">DRAFT</span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isSuperAdmin ? (
                                    <>
                                        <button
                                            onClick={() => handleTogglePublish(year)}
                                            className={`p-1.5 rounded transition-colors ${year.isPublished ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}`}
                                            title={year.isPublished ? "Unpublish" : "Publish"}
                                        >
                                            {year.isPublished ? <FaEye /> : <FaEyeSlash />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteYear(year._id)}
                                            className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => handleActivate(year._id)}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                                    >
                                        Activate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* History */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FaHistory className="text-slate-500" /> Session History
            </h3>
            <div className="space-y-3">
                {pastYears.length === 0 ? (
                    <div className="text-slate-500 text-sm italic">No past sessions found.</div>
                ) : (
                    pastYears.map(year => (
                        <div key={year._id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <div className="text-slate-300 font-medium">{year.name}</div>
                                <div className="text-xs text-slate-500">
                                    {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">
                                    {year.status}
                                </span>
                                <button 
                                    onClick={() => handleViewRecords(year)}
                                    className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-3 py-1 rounded transition-colors"
                                >
                                    View Records
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Create Year Modal (Super Admin Only) */}
      {/* Removed from here as it is now handled in the Super Admin specific view block above */}

      {/* Promotion Modal */}
      <Modal isOpen={isPromotionModalOpen} onClose={() => setIsPromotionModalOpen(false)} title="Promote Students">
        <StudentPromotionManager 
            onClose={() => setIsPromotionModalOpen(false)}
            onSuccess={() => {
                // Maybe refresh stats or something
                setIsPromotionModalOpen(false);
            }}
        />
      </Modal>

      {/* History Records Modal */}
      <Modal isOpen={!!viewingYear} onClose={() => setViewingYear(null)} title={`Academic Records: ${viewingYear?.name}`}>
        <div className="max-h-[60vh] overflow-y-auto">
            {loadingRecords ? (
                <div className="p-8 flex justify-center"><LoadingSpinner /></div>
            ) : yearRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No records found for this academic year.</div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-700">
                            <th className="p-2">Student</th>
                            <th className="p-2">Grade</th>
                            <th className="p-2">Roll No</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Moved To</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-300">
                        {yearRecords.map(record => (
                            <tr key={record._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="p-2 font-medium">{record.student?.name || "Unknown"}</td>
                                <td className="p-2">{record.grade}</td>
                                <td className="p-2">{record.rollNumber}</td>
                                <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                        record.finalStatus === 'PROMOTED' ? 'bg-emerald-500/10 text-emerald-400' :
                                        record.finalStatus === 'GRADUATED' ? 'bg-blue-500/10 text-blue-400' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {record.finalStatus}
                                    </span>
                                </td>
                                <td className="p-2 text-slate-500">{record.promotedToGrade}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </Modal>
    </div>
  );
}
