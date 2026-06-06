'use client';

import Sidebar from './Sidebar';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FaBars } from 'react-icons/fa';
import PratyoLogo from '@/components/brand/PratyoLogo';
import AuthenticatedPublicLinkGuard from '@/components/AuthenticatedPublicLinkGuard';

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

    if (!session) {
        return (
            <div className="pratyo-page-shell flex min-h-screen items-center justify-center px-4">
                <div className="text-center">
                    <PratyoLogo variant="icon" compact withSurface />
                    <p className="mt-4 text-sm font-semibold text-[var(--brand-primary)]">
                        Loading your workspace...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="pratyo-page-shell min-h-screen font-sans">
            <AuthenticatedPublicLinkGuard />
            {isNavOpen && (
                <button
                    type="button"
                    aria-label="Close navigation overlay"
                    onClick={() => setIsNavOpen(false)}
                    className="fixed inset-0 z-40 bg-[rgba(16,20,47,0.4)] backdrop-blur-sm lg:hidden"
                />
            )}
            <Sidebar
                role={session?.user?.role || "SCHOOL_ADMIN"}
                isMobileOpen={isNavOpen}
                onNavigate={() => setIsNavOpen(false)}
            />

            <header className="sticky top-0 z-30 border-b border-[var(--brand-border)] bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <PratyoLogo variant="icon" compact withSurface />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--brand-ink)]">
                                {session?.user?.name || "Pratyo"}
                            </p>
                            <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                                {String(session?.user?.role || "Dashboard").replaceAll("_", " ")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsNavOpen(true)}
                        className="rounded-lg border border-[var(--brand-border)] p-2.5 text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary-soft)]"
                        aria-label="Open navigation"
                    >
                        <FaBars />
                    </button>
                </div>
            </header>

            <main className="min-h-screen overflow-x-hidden transition-all duration-300 lg:ml-[var(--sidebar-width)]">
                <div className="mx-auto max-w-7xl px-3 py-4 pb-8 sm:px-5 sm:py-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
