"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FaPlus,
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
  const [status, setStatus] = useState("ALL");

  // Fetch Teachers
  const fetchTeachers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(status !== "ALL" && { status }),
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
  }, [search, status]);

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
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-emerald-500 md:w-44"
        >
          <option value="ALL">All Mentors</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Link
          href="/school/dashboard?tab=register-teacher"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition w-full md:w-auto"
        >
          <FaPlus className="text-sm" />
          Add Teacher
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_12px_30px_rgba(10,47,102,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#27344a]">
            <thead className="bg-[#eaf2ff] text-[#52657d] uppercase text-xs">
              <tr>
                <th className="p-4">Teacher</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Details</th>
                <th className="p-4">Role & Focus Area</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d7cdbb]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Loading teachers...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    {search ? "No teachers match this search." : "No teachers found."}
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher._id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="p-4">
                      <div className="font-bold text-[#17120a]">{teacher.name}</div>
                      <div className="text-xs text-[#52657d]">{teacher.designation || "Teacher"}</div>
                      <div className="mt-1 text-xs text-[#52657d]">Joined: {teacher.dateOfJoining ? new Date(teacher.dateOfJoining).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[#27344a]">{teacher.email}</div>
                      <div className="text-xs text-[#52657d]">{teacher.phone}</div>
                      <div className="mt-1 text-xs text-[#52657d]">{teacher.address}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-[#344f77]">
                        <span className="text-[#52657d]">Qual:</span> {teacher.qualification || 'N/A'}
                      </div>
                      <div className="text-xs text-[#344f77]">
                        <span className="text-[#52657d]">Exp:</span> {teacher.experience ? `${teacher.experience} yrs` : 'N/A'}
                      </div>
                      <div className="text-xs text-[#344f77]">
                        <span className="text-[#52657d]">Type:</span> {teacher.employmentType || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {teacher.roles.map((role, i) => (
                          <span key={i} className="rounded-full border border-[#bfd7f7] bg-[#eaf2ff] px-2 py-0.5 text-xs font-semibold text-[#0a2f66]">
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-emerald-400">{teacher.subject || "General mentoring"}</div>
                    </td>
                    <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            String(teacher.status || "ACTIVE").toUpperCase() === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                            {teacher.status || "ACTIVE"}
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
            <div className="border-t border-[#d7cdbb] p-4">
                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    totalItems={pagination.totalTeachers}
                    start={pagination.start}
                    end={pagination.end}
                />
            </div>
        )}
      </div>
    </div>
  );
}
