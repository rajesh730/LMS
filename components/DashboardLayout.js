'use client';

import Sidebar from './Sidebar';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import PravyoLogo from '@/components/brand/PravyoLogo';
import AuthenticatedPublicLinkGuard from '@/components/AuthenticatedPublicLinkGuard';

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U';
}

export default function DashboardLayout({ children }) {
  const { data: session } = useSession();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  useEffect(() => {
    if (session?.error === 'SessionRevoked') {
      signOut({ callbackUrl: '/login' });
    }
  }, [session]);

  useEffect(() => {
    if (!isNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isNavOpen]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const movedEnough = Math.abs(currentScrollY - lastScrollY) > 8;

      if (movedEnough) {
        setIsHeaderHidden(scrollingDown && currentScrollY > 72);
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!session) {
    return (
      <div className="pravyo-page-shell flex min-h-screen items-center justify-center px-4">
        <div className="text-center pravyo-animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-primary-soft)] shadow-sm">
            <PravyoLogo variant="icon" compact withSurface />
          </div>
          <p className="text-sm font-semibold text-[var(--brand-primary)]">
            Loading your workspace…
          </p>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">Please wait a moment</p>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || session?.user?.email || 'Dashboard';
  const userRole = String(session?.user?.role || 'User').replaceAll('_', ' ');
  const initials = getInitials(session?.user?.name || '');

  return (
    <div className="pravyo-page-shell min-h-screen font-sans">
      <AuthenticatedPublicLinkGuard />

      {/* Overlay backdrop for mobile nav */}
      {isNavOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setIsNavOpen(false)}
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(16, 20, 47, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        />
      )}

      <Sidebar
        role={session?.user?.role || 'SCHOOL_ADMIN'}
        isMobileOpen={isNavOpen}
        onNavigate={() => setIsNavOpen(false)}
      />

      {/* ── Mobile top header ─────────────────────────────── */}
      <header
        className={`dashboard-mobile-header sticky top-0 z-30 px-3 py-2.5 lg:hidden ${
          isHeaderHidden && !isNavOpen ? 'dashboard-mobile-header-hidden' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, #ffffff 60%, #f4f1ff 100%)',
          borderBottom: '1px solid var(--brand-border)',
          boxShadow: '0 1px 12px rgba(67, 38, 232, 0.06)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Logo + user info */}
          <div className="flex min-w-0 items-center gap-3">
            <PravyoLogo variant="icon" compact withSurface />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--brand-ink)] leading-tight">
                {userName}
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-muted)] leading-tight">
                {userRole}
              </p>
            </div>
          </div>

          {/* Hamburger button */}
          <button
            type="button"
            id="dashboard-mobile-nav-toggle"
            onClick={() => setIsNavOpen((prev) => !prev)}
            className="dashboard-mobile-menu-btn flex-shrink-0"
            aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isNavOpen}
          >
            <span
              className="transition-transform duration-200"
              style={{ display: 'block', transform: isNavOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              {isNavOpen ? <FaTimes className="text-sm" /> : <FaBars className="text-sm" />}
            </span>
          </button>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main
        className="min-h-screen overflow-x-hidden transition-all duration-300 lg:ml-[var(--sidebar-width)]"
      >
        <div className="dashboard-content-frame mx-auto max-w-7xl px-0 py-3 pb-10 sm:px-5 sm:py-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
