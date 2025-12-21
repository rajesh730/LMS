"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaChalkboardTeacher,
  FaSearch,
} from "react-icons/fa";
import PaginationControls from "@/components/PaginationControls";

export default function TeacherManager() {
  // Data State
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalTeachers: 0,
    limit: 10,
  });

  // Filters & Search
  const [search, setSearch] = useState("");

  // Fetch Teachers
  const fetchTeachers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
      });

      const res = await fetch(`/api/teachers?${params}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both paginated and non-paginated responses
        if (data.teachers) {
            setTeachers(data.teachers);
            if (data.pagination) {
                setPagination(data.pagination);
            } else {
                // Fallback if API doesn't return pagination
                setPagination({
                    page: 1,
                    totalPages: 1,
                    totalTeachers: data.teachers.length,
                    limit: data.teachers.length
                });
            }
        }
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchTeachers]);

  const handlePageChange = (newPage) => {
    fetchTeachers(newPage);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full md:max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-700 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">Teacher</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Details</th>
                <th className="p-4">Role & Subject</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Loading teachers...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{teacher.name}</div>
                      <div className="text-xs text-slate-500">{teacher.designation || "Teacher"}</div>
                      <div className="text-xs text-slate-600 mt-1">Joined: {teacher.dateOfJoining ? new Date(teacher.dateOfJoining).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{teacher.email}</div>
                      <div className="text-xs text-slate-500">{teacher.phone}</div>
                      <div className="text-xs text-slate-600 mt-1">{teacher.address}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Qual:</span> {teacher.qualification || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Exp:</span> {teacher.experience ? `${teacher.experience} yrs` : 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Type:</span> {teacher.employmentType || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {teacher.roles.map((role, i) => (
                          <span key={i} className="bg-slate-700 px-2 py-0.5 rounded text-xs">
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-emerald-400">{teacher.subject}</div>
                    </td>
                    <td className="p-4">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs">
                            Active
                        </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && teachers.length > 0 && (
            <div className="p-4 border-t border-slate-800">
                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>
        )}
      </div>
    </div>
  );
}
