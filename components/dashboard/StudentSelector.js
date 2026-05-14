'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaCheck } from 'react-icons/fa';
import { TableSkeleton } from '@/components/Skeletons';
import { gradeListContains } from '@/lib/schoolGrades';

export default function StudentSelector({ selectedIds = [], onChange, eligibleGrades = [] }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');

    // Load Students
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: 1,
                limit: 500,
                ...(search && { search }),
            });

            const res = await fetch(`/api/students?${params}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(Array.isArray(data.students) ? data.students : []);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchStudents]);

    const eligibleStudents = students.filter((student) =>
        gradeListContains(eligibleGrades, student.grade)
    );

    const toggleSelection = (id) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(sid => sid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectPage = () => {
        const newIds = [...selectedIds];
        eligibleStudents.forEach(s => {
            if (!newIds.includes(s._id)) newIds.push(s._id);
        });
        onChange(newIds);
    };

    return (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white">Select Students</h3>
                <span className="text-emerald-400 text-sm font-medium">{selectedIds.length} Selected</span>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                    <input
                        type="text"
                        placeholder="Search name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-slate-900 text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 w-full text-sm focus:border-emerald-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton rows={4} cols={2} />
            ) : (
                <>
                    <div className="max-h-[300px] overflow-y-auto mb-4 custom-scrollbar">
                        {eligibleStudents.length > 0 ? (
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-900 text-xs uppercase sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 w-8">
                                            <button onClick={selectPage} className="text-xs bg-slate-700 px-1 rounded hover:bg-slate-600" title="Select All on Page">All</button>
                                        </th>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {eligibleStudents.map(student => {
                                        const isSelected = selectedIds.includes(student._id);
                                        return (
                                            <tr
                                                key={student._id}
                                                className={`hover:bg-slate-700/30 cursor-pointer transition ${isSelected ? 'bg-emerald-900/10' : ''}`}
                                                onClick={() => toggleSelection(student._id)}
                                            >
                                                <td className="p-2 text-center">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600'}`}>
                                                        {isSelected && <FaCheck className="text-[10px]" />}
                                                    </div>
                                                </td>
                                                <td className="p-2 font-medium text-white">{student.name}</td>
                                                <td className="p-2 text-slate-400">{student.grade}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">No students found</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
