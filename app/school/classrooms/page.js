'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { FaPlus, FaChalkboardTeacher, FaUsers } from 'react-icons/fa';

export default function ClassroomsPage() {
    const { data: session } = useSession();
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({ name: '', capacity: 30 });

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const fetchClassrooms = async () => {
        try {
            const res = await fetch('/api/classrooms');
            if (res.ok) {
                const data = await res.json();
                setClassrooms(data.classrooms);
            }
        } catch (error) {
            console.error('Error fetching classrooms', error);
        } finally {
            setLoading(false);
        }
    };

    const createClassroom = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/classrooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClass),
            });
            if (res.ok) {
                const data = await res.json();
                setClassrooms([...classrooms, data.classroom]);
                setShowModal(false);
                setNewClass({ name: '', capacity: 30 });
            }
        } catch (error) {
            console.error('Error creating classroom', error);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Classrooms</h1>
                    <p className="text-slate-400 mt-1">Manage classes and sections</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition"
                >
                    <FaPlus /> Add Class
                </button>
            </div>

            {loading ? (
                <div className="text-slate-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {classrooms.map((cls) => (
                        <div key={cls._id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">{cls.name}</h3>
                                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                                    Capacity: {cls.capacity}
                                </span>
                            </div>

                            <div className="space-y-3 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <FaChalkboardTeacher className="text-emerald-500" />
                                    <span>{cls.classTeacher ? cls.classTeacher.name : 'No Class Teacher'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaUsers className="text-blue-500" />
                                    <span>0 Students</span> {/* Placeholder for student count */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Create New Class</h3>
                        <form onSubmit={createClassroom} className="space-y-4">
                            <div>
                                <label className="block text-slate-400 mb-2 text-sm">Class Name</label>
                                <input
                                    type="text"
                                    value={newClass.name}
                                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                                    placeholder="e.g., Class 10A"
                                    className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-2 text-sm">Capacity</label>
                                <input
                                    type="number"
                                    value={newClass.capacity}
                                    onChange={(e) => setNewClass({ ...newClass, capacity: parseInt(e.target.value) })}
                                    className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white px-4 py-2">Cancel</button>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
