'use client';

import { FaTimes, FaCalendarAlt, FaClock, FaUsers, FaUser, FaPhone, FaUserGraduate, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';

export default function EventDetailModal({ event, isParticipating, onClose, onJoin, onLeave, currentParticipation }) {
    if (!event) return null;

    const isDeadlinePassed = event.registrationDeadline && new Date() > new Date(event.registrationDeadline);
    const isFull = event.maxParticipants && (event.participantCount || 0) >= event.maxParticipants;
    const canJoin = !isParticipating && !isDeadlinePassed && !isFull;

    const getStatusBadge = () => {
        if (isParticipating) {
            return <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm flex items-center gap-1"><FaCheckCircle /> Participating</span>;
        }
        if (isDeadlinePassed) {
            return <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">Registration Closed</span>;
        }
        if (isFull) {
            return <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">Event Full</span>;
        }
        return <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">Open for Registration</span>;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
                        {getStatusBadge()}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Event Details */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                <FaCalendarAlt /> Event Date
                            </div>
                            <div className="text-white font-medium">
                                {formatDate(event.date)}
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                <FaUsers /> Participants
                            </div>
                            <div className="text-white font-medium">
                                {event.participantCount || 0} {event.maxParticipants ? `/ ${event.maxParticipants}` : ''} schools
                            </div>
                        </div>
                        {event.maxParticipantsPerSchool && (
                            <div className="bg-slate-900/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                    <FaUser /> Max Students / School
                                </div>
                                <div className="text-white font-medium">
                                    {event.maxParticipantsPerSchool} Students
                                </div>
                            </div>
                        )}
                        {event.eligibleGrades && event.eligibleGrades.length > 0 && (
                            <div className="bg-slate-900/50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                    <FaUserGraduate /> Eligible Grades
                                </div>
                                <div className="text-white font-medium flex flex-wrap gap-1">
                                    {event.eligibleGrades.map(g => (
                                        <span key={g} className="bg-slate-700 px-2 py-0.5 rounded text-xs">{g}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {event.registrationDeadline && (
                        <div className={`p-4 rounded-xl ${isDeadlinePassed ? 'bg-red-900/20 border border-red-800' : 'bg-yellow-900/20 border border-yellow-800'}`}>
                            <div className="flex items-center gap-2 text-sm mb-1 ${isDeadlinePassed ? 'text-red-400' : 'text-yellow-400'}">
                                <FaClock /> Registration Deadline
                            </div>
                            <div className={`font-medium ${isDeadlinePassed ? 'text-red-300' : 'text-yellow-300'}`}>
                                {formatDate(event.registrationDeadline)}
                                {isDeadlinePassed && <span className="ml-2 text-red-400">(Passed)</span>}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900/50 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <FaInfoCircle /> Description
                        </div>
                        <p className="text-slate-300">{event.description}</p>
                    </div>

                    {/* Current Participation Details */}
                    {isParticipating && currentParticipation && (
                        <div className="bg-emerald-900/20 border border-emerald-800 p-4 rounded-xl">
                            <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                                <FaCheckCircle /> Your Participation Details
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <FaUser className="text-slate-500" />
                                    <span className="text-slate-300">{currentParticipation.contactPerson}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-slate-500" />
                                    <span className="text-slate-300">{currentParticipation.contactPhone}</span>
                                </div>
                                {currentParticipation.expectedStudents > 0 && (
                                    <div className="flex items-center gap-2">
                                        <FaUserGraduate className="text-slate-500" />
                                        <span className="text-slate-300">{currentParticipation.expectedStudents} students</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <FaCalendarAlt className="text-slate-500" />
                                    <span className="text-slate-300">Joined {new Date(currentParticipation.joinedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {currentParticipation.notes && (
                                <p className="text-slate-400 text-sm mt-3 italic">Note: {currentParticipation.notes}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition"
                    >
                        Close
                    </button>
                    {isParticipating ? (
                        <button
                            onClick={onLeave}
                            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
                        >
                            <FaTimesCircle /> Leave Event
                        </button>
                    ) : canJoin ? (
                        <button
                            onClick={onJoin}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
                        >
                            <FaCheckCircle /> Take Part
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
