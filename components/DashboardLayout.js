'use client';

import Sidebar from './Sidebar';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FaBars } from 'react-icons/fa';
import PratyoLogo from '@/components/brand/PratyoLogo';

export default function DashboardLayout({ children }) {
    const { data: session } = useSession();
    const [isNavOpen, setIsNavOpen] = useState(false);

    useEffect(() => {
        if (session?.error === "SessionRevoked") {
            signOut({ callbackUrl: "/login" });
        }
    }, [session]);

    // Keep auth transitions from looking like a broken blank screen.
    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f5f1e8] px-4 text-[#17120a]">
                <div className="text-center">
                    <PratyoLogo variant="icon" compact withSurface />
                    <p className="mt-4 text-sm font-semibold text-[#0a2f66]">
                        Loading your workspace...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f1e8] text-[#17120a] font-sans selection:bg-[#2f7fdb]/25">
            {isNavOpen && (
                <button
                    type="button"
                    aria-label="Close navigation overlay"
                    onClick={() => setIsNavOpen(false)}
                    className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
                />
            )}
            <Sidebar
                role={session?.user?.role || "SCHOOL_ADMIN"}
                isMobileOpen={isNavOpen}
                onNavigate={() => setIsNavOpen(false)}
            />

            <header className="pratyo-dark-shell sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <PratyoLogo variant="icon" compact withSurface />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                                {session?.user?.name || "Pratyo"}
                            </p>
                            <p className="pratyo-muted text-xs uppercase tracking-wide">
                                {String(session?.user?.role || "Dashboard").replaceAll("_", " ")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsNavOpen(true)}
                        className="rounded-lg border border-white/15 p-3 transition hover:bg-white/10"
                        aria-label="Open navigation"
                    >
                        <FaBars />
                    </button>
                </div>
            </header>

            <main className="min-h-screen transition-all duration-300 lg:ml-64">
                <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
