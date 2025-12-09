'use client';

import { signOut } from 'next-auth/react';
import { FaBan } from 'react-icons/fa';

export default function SuspendedPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
            <div className="bg-slate-900 p-8 rounded-2xl border border-red-500/30 shadow-2xl max-w-md text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaBan className="text-3xl text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-4">Account Suspended</h1>
                <p className="text-slate-400 mb-8">
                    Your school's subscription is currently inactive. Please contact the Super Admin to reactivate your account.
                </p>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-full transition border border-slate-700"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
