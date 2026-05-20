"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import Link from "next/link";

export default function StudentLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const currentRole = session?.user?.role
    ? String(session.user.role).replaceAll("_", " ")
    : null;
  const currentName = session?.user?.name || null;
  const currentEmail = session?.user?.email || null;

  const handleContinue = () => {
    const role = session?.user?.role;
    if (role === "STUDENT") router.push("/student/dashboard");
    else if (role === "SUPER_ADMIN") router.push("/admin/dashboard");
    else if (role === "SCHOOL_ADMIN") router.push("/school/dashboard");
    else if (role === "TEACHER") router.push("/teacher/dashboard");
    else router.push("/");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: username.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Redirect to student dashboard
        router.push("/student/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 px-4 py-6">
        <div className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-blue-50 hover:text-white">
            Back to home
          </Link>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/events" className="rounded-lg border border-white/30 px-3 py-2 text-blue-50 hover:bg-white/10">
              Events
            </Link>
            <Link href="/login" className="rounded-lg border border-white/30 px-3 py-2 text-blue-50 hover:bg-white/10">
              School/Admin Login
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="inline-block bg-blue-100 rounded-full p-4 mb-4">
              <User size={36} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              You are already signed in
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This browser already has an active session. To log in as a student
              here, sign out first or use an incognito window / separate browser
              profile.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current account
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {currentRole || "Signed-in account"}
            </p>
            {currentName && (
              <p className="mt-1 text-sm text-slate-700">{currentName}</p>
            )}
            {currentEmail && (
              <p className="mt-1 text-xs text-slate-500">{currentEmail}</p>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Continue with this account
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/student/login" })}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign out and log in as student
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 px-4 py-6">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      <div className="relative z-10 mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-blue-50 hover:text-white">
          Back to home
        </Link>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/events" className="rounded-lg border border-white/30 px-3 py-2 text-blue-50 hover:bg-white/10">
            Events
          </Link>
          <Link href="/login" className="rounded-lg border border-white/30 px-3 py-2 text-blue-50 hover:bg-white/10">
            School/Admin Login
          </Link>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-full p-4 mb-4">
            <User size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Student Portal</h1>
          <p className="text-blue-100">Log in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8 mb-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">Login Failed</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Help */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a
                href="mailto:support@egrantha.com"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Need help logging in?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          {/* Other Options */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              School/Admin Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100">
          Need help?{" "}
          <a href="mailto:support@egrantha.com" className="text-white font-semibold hover:underline">
            Contact support
          </a>
        </p>
      </div>

      {/* Additional CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
