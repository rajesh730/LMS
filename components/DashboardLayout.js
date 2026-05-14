'use client';

import Sidebar from './Sidebar';
import { signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.error === "SessionRevoked") {
            signOut({ callbackUrl: "/login" });
        }
    }, [session]);

    // If no session, we don't render the sidebar (middleware handles redirect)
    // But for smooth transition, we check.
    if (!session) return null;

    return (
        <div className="min-h-screen bg-[#071833] text-[#eef5ff] font-sans selection:bg-[#ffb21c]/30">
            <Sidebar role={session?.user?.role || "SCHOOL_ADMIN"} />
            <main className="ml-64 min-h-screen transition-all duration-300">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
