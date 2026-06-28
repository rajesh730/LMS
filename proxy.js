import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const DASHBOARD_BY_ROLE = {
    SUPER_ADMIN: '/admin/dashboard',
    SCHOOL_ADMIN: '/school/dashboard',
    TEACHER: '/teacher/dashboard',
    STUDENT: '/student/dashboard',
};

export default withAuth(
    function proxy(req) {
        const { pathname } = req.nextUrl;
        const { token } = req.nextauth;

        // Redirect authenticated users before rendering the public homepage.
        // This keeps `/` cacheable and avoids a session-backed DB lookup.
        if (pathname === '/' && token?.role && !token?.error) {
            const destination = DASHBOARD_BY_ROLE[token.role];
            if (destination) {
                return NextResponse.redirect(new URL(destination, req.url));
            }
        }

        // Protect Admin Routes
        if (pathname.startsWith('/admin') && token?.role !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL('/school/dashboard', req.url));
        }

        // Protect School Routes (Teachers & Admins)
        if (pathname.startsWith('/school')) {
            if (token?.role !== 'SCHOOL_ADMIN' && token?.role !== 'TEACHER') {
                if (token?.role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', req.url));
                // If Student tries to access school/teacher admin area, redirect to student dashboard
                if (token?.role === 'STUDENT') return NextResponse.redirect(new URL('/student/dashboard', req.url));
                return NextResponse.redirect(new URL('/login', req.url));
            }
            if (token?.role === 'SCHOOL_ADMIN' && token?.status === 'UNSUBSCRIBED' && !pathname.startsWith('/school/suspended')) {
                return NextResponse.redirect(new URL('/school/suspended', req.url));
            }
        }

        // Protect Teacher Routes (LMS Content Creation)
        if (pathname.startsWith('/teacher')) {
            if (token?.role !== 'TEACHER' && token?.role !== 'SCHOOL_ADMIN') {
                return NextResponse.redirect(new URL('/login', req.url));
            }
        }

        // Protect Student Routes (LMS Learning)
        // Allow /student/login without authentication
        if (pathname.startsWith('/student') && pathname !== '/student/login') {
            if (token?.role !== 'STUDENT') {
                // Redirect teachers/admins back to their dashboards if they try to access student area
                if (token?.role === 'TEACHER' || token?.role === 'SCHOOL_ADMIN') {
                    return NextResponse.redirect(new URL('/school/dashboard', req.url));
                }
                return NextResponse.redirect(new URL('/login', req.url));
            }
        }
    },
    {
        pages: {
            signIn: '/login',
        },
        callbacks: {
            authorized: ({ req, token }) => {
                // The public homepage remains accessible without a session.
                if (req.nextUrl.pathname === '/') {
                    return true;
                }
                // Allow /student/login without authentication
                if (req.nextUrl.pathname === '/student/login') {
                    return true;
                }
                // Require token for all other matched routes
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ['/', '/admin/:path*', '/school/:path*', '/teacher/:path*', '/student/:path*'],
};
