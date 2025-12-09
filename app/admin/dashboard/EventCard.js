'use client';

import { useState } from 'react';
import { FaUsers, FaChevronDown, FaChevronUp, FaTrash, FaClock, FaPhone, FaUser, FaUserGraduate, FaCalendarAlt, FaDownload, FaSpinner, FaEdit } from 'react-icons/fa';

export default function EventCard({ event, onDelete, isDeleting, onEdit }) {
    const [expanded, setExpanded] = useState(false);
    const participantCount = event.participants?.length || 0;

    // Calculate total expected students
    const totalExpectedStudents = event.participants?.reduce((sum, p) => sum + (p.expectedStudents || 0), 0) || 0;

    // Calculate days until deadline
    const getDaysUntilDeadline = () => {
        if (!event.registrationDeadline) return null;
        const deadline = new Date(event.registrationDeadline);
        const today = new Date();
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilDeadline = getDaysUntilDeadline();
    const isDeadlinePassed = daysUntilDeadline !== null && daysUntilDeadline < 0;

    const exportToCSV = () => {
        if (!event.participants || event.participants.length === 0) {
            alert('No participants to export');
            return;
        }

        const headers = 'School Name,Contact Person,Phone,Expected Students,Joined Date,Notes';
        const rows = event.participants.map(p => {
            const schoolName = p.school?.schoolName || 'Unknown';
            const joinDate = new Date(p.joinedAt).toLocaleDateString();
            return `"${schoolName}","${p.contactPerson || ''}","${p.contactPhone || ''}","${p.expectedStudents || 0}","${joinDate}","${p.notes || ''}"`;
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${event.title.replace(/[^a-z0-9]/gi, '_')}_participants.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Progress percentage for max participants
    const progressPercent = event.maxParticipants
        ? Math.min((participantCount / event.maxParticipants) * 100, 100)
        : 0;

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-xl font-bold text-white mb-1">{event.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                                <FaCalendarAlt className="text-emerald-400" />
                                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">
                                {event.targetGroup?.name || 'Global'}
                            </span>
                        </div>

                        {/* Limits Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {event.maxParticipantsPerSchool && (
                                <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-300">
                                    Max {event.maxParticipantsPerSchool}/School
                                </span>
                            )}
                            {event.eligibleGrades && event.eligibleGrades.length > 0 && (
                                <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-300" title={event.eligibleGrades.join(', ')}>
                                    {event.eligibleGrades.length} Grades Eligible
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-emerald-400">{participantCount}</div>
                        <div className="text-xs text-slate-400">Schools Joined</div>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-400">{totalExpectedStudents}</div>
                        <div className="text-xs text-slate-400">Students Expected</div>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg text-center">
                        {daysUntilDeadline !== null ? (
                            <>
                                <div className={`text-2xl font-bold ${isDeadlinePassed ? 'text-red-400' : daysUntilDeadline <= 3 ? 'text-yellow-400' : 'text-slate-300'}`}>
                                    {isDeadlinePassed ? 'Closed' : daysUntilDeadline}
                                </div>
                                <div className="text-xs text-slate-400">{isDeadlinePassed ? 'Registration' : 'Days Left'}</div>
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-slate-500">∞</div>
                                <div className="text-xs text-slate-400">No Deadline</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress bar for max participants */}
                {event.maxParticipants && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Slots Filled</span>
                            <span>{participantCount} / {event.maxParticipants}</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${progressPercent >= 100 ? 'bg-red-500' : progressPercent >= 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                <p className="text-slate-400 text-sm">{event.description}</p>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onEdit && onEdit(event)}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-blue-500/20"
                        title="Edit Event"
                    >
                        <FaEdit size={18} />
                    </button>

                    <button
                        onClick={() => onDelete(event._id)}
                        disabled={isDeleting}
                        className={`p-3 rounded-lg flex items-center justify-center transition shadow-lg ${isDeleting
                            ? 'bg-red-500/50 text-white/50 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-500 text-white hover:shadow-red-500/20'
                            }`}
                        title="Delete Event"
                    >
                        {isDeleting ? <FaSpinner className="animate-spin" size={18} /> : <FaTrash size={18} />}
                    </button>

                    {participantCount > 0 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex-1 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition flex items-center justify-center gap-2"
                        >
                            {expanded ? <FaChevronUp /> : <FaChevronDown />}
                            {expanded ? 'Hide' : 'View'} Participants
                        </button>
                    )}
                    {participantCount > 0 && (
                        <button
                            onClick={exportToCSV}
                            className="py-2 px-4 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                        >
                            <FaDownload /> Export
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable Participants Section */}
            {expanded && participantCount > 0 && (
                <div className="border-t border-slate-700 bg-slate-900/50 p-5">
                    <h5 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <FaUsers className="text-emerald-400" /> Participating Schools ({participantCount})
                    </h5>

                    <div className="space-y-3">
                        {event.participants.map((participant, index) => (
                            <div key={index} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h6 className="text-white font-medium text-lg">
                                            {participant.school?.schoolName || 'Unknown School'}
                                        </h6>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 text-sm">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <FaUser className="text-slate-500" />
                                                <span>{participant.contactPerson}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <FaPhone className="text-slate-500" />
                                                <span>{participant.contactPhone}</span>
                                            </div>
                                            {participant.expectedStudents > 0 && (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <FaUserGraduate className="text-slate-500" />
                                                    <span>{participant.expectedStudents} students</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <FaCalendarAlt className="text-slate-500" />
                                                <span>Joined {new Date(participant.joinedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {participant.notes && (
                                            <p className="text-slate-500 text-sm mt-2 italic">
                                                "{participant.notes}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Student List */}
                                    {participant.students && participant.students.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-slate-700 w-full">
                                            <h6 className="text-sm font-semibold text-slate-400 mb-2">Registered Students:</h6>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {participant.students.map((student, sIndex) => (
                                                    <div key={sIndex} className="bg-slate-900/50 p-2 rounded text-sm flex justify-between items-center">
                                                        <span className="text-slate-200">{typeof student === 'object' ? student.name : `Student ID: ${student}`}</span>
                                                        {typeof student === 'object' && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400">{student.grade}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
