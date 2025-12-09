import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const { token } = req.nextauth;

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
        if (pathname.startsWith('/student')) {
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
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ['/admin/:path*', '/school/:path*', '/teacher/:path*', '/student/:path*'],
};
