'use client';

import Sidebar from './Sidebar';
import { useSession } from 'next-auth/react';

export default function DashboardLayout({ children }) {
    const { data: session } = useSession();
    console.log("[DashboardLayout] session:", session);

    // If no session, we don't render the sidebar (middleware handles redirect)
    // But for smooth transition, we check.
    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
            <Sidebar role={session?.user?.role || "SCHOOL_ADMIN"} />
            <main className="ml-64 min-h-screen transition-all duration-300">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
