'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
    FaChartPie,
    FaCalendarAlt,
    FaUsers,
    FaCog,
    FaSignOutAlt,
    FaUniversity,
    FaChalkboardTeacher
} from 'react-icons/fa';

export default function Sidebar({ role }) {
    const pathname = usePathname();

    const adminLinks = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: FaChartPie },
        { name: 'Events', href: '/admin/events', icon: FaCalendarAlt }, // Future route
        { name: 'Settings', href: '/admin/settings', icon: FaCog }, // Future route
    ];

    const schoolLinks = [
        { name: 'Dashboard', href: '/school/dashboard', icon: FaChartPie },
        { name: 'Classrooms', href: '/school/classrooms', icon: FaChalkboardTeacher },
        { name: 'Settings', href: '/school/settings', icon: FaCog }, // Future route
    ];

    const teacherLinks = [
        { name: 'My Subjects', href: '/teacher/dashboard', icon: FaChalkboardTeacher }, // LMS
        { name: 'School Dashboard', href: '/school/dashboard', icon: FaChartPie }, // SMS View (if allowed)
    ];

    const studentLinks = [
        { name: 'My Learning', href: '/student/dashboard', icon: FaUniversity },
    ];

    let links = [];
    if (role === 'SUPER_ADMIN') links = adminLinks;
    else if (role === 'SCHOOL_ADMIN') links = schoolLinks;
    else if (role === 'TEACHER') links = teacherLinks;
    else if (role === 'STUDENT') links = studentLinks;

    return (
        <aside className="w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300">
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <FaUniversity className="text-white text-sm" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                    E-Grantha
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600/10 text-blue-400 shadow-sm border border-blue-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <Icon className={`text-lg ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                            <span className="font-medium">{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                >
                    <FaSignOutAlt className="text-lg group-hover:text-red-300" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
