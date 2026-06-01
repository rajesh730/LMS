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

    useEffect(() => {
        if (!isNavOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isNavOpen]);

    // Keep auth transitions from looking like a broken blank screen.
    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-4 text-[#10142f]">
                <div className="text-center">
                    <PratyoLogo variant="icon" compact withSurface />
                    <p className="mt-4 text-sm font-semibold text-[#4326e8]">
                        Loading your workspace...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fbfcff] text-[#10142f] font-sans selection:bg-[#4326e8]/18">
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

            <header className="sticky top-0 z-30 border-b border-[#e6eaf7] bg-white/95 px-4 py-3 text-[#4326e8] shadow-sm backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <PratyoLogo variant="icon" compact withSurface />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#4326e8]">
                                {session?.user?.name || "Pratyo"}
                            </p>
                            <p className="text-xs font-black uppercase tracking-wide text-[#526071]">
                                {String(session?.user?.role || "Dashboard").replaceAll("_", " ")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsNavOpen(true)}
                        className="rounded-full border border-[#e6eaf7] p-3 text-[#4326e8] transition hover:bg-[#f4f1ff]"
                        aria-label="Open navigation"
                    >
                        <FaBars />
                    </button>
                </div>
            </header>

            <main className="min-h-screen overflow-x-hidden transition-all duration-300 lg:ml-64">
                <div className="mx-auto max-w-7xl px-4 py-5 pb-10 sm:px-6 sm:py-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
