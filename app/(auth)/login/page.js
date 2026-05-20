"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { status, data: session } = useSession();
  const router = useRouter();
  const currentRole = session?.user?.role
    ? String(session.user.role).replaceAll("_", " ")
    : null;
  const currentName = session?.user?.name || null;
  const currentEmail = session?.user?.email || null;

  const handleContinue = () => {
    const role = session?.user?.role;
    if (role === "SUPER_ADMIN") router.push("/admin/dashboard");
    else if (role === "SCHOOL_ADMIN") router.push("/school/dashboard");
    else if (role === "TEACHER") router.push("/teacher/dashboard");
    else if (role === "STUDENT") router.push("/student/dashboard");
    else router.push("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res.error) {
        setError("Invalid credentials");
        return;
      }

      // Fetch session to determine role and redirect
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();

      if (sessionData?.user) {
        const role = sessionData.user.role;
        if (role === "SUPER_ADMIN") router.push("/admin/dashboard");
        else if (role === "SCHOOL_ADMIN") router.push("/school/dashboard");
        else if (role === "TEACHER") router.push("/teacher/dashboard");
        else if (role === "STUDENT") router.push("/student/dashboard");
        else router.push("/school/dashboard"); // Fallback
      } else {
        router.push("/school/dashboard");
      }
    } catch (err) {
      setError("Something went wrong");
    }
  };

  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-3 pt-4">
          <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white">
            Back to home
          </Link>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/events" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">
              Events
            </Link>
            <Link href="/schools" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">
              Schools
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            Already Signed In
          </h2>
          <p className="text-slate-300 text-center text-sm leading-6">
            This browser already has an active session. To use another account
            here, sign out first. If you need both accounts open at the same
            time, use an incognito window or a different browser profile.
          </p>

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current account
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {currentRole || "Signed-in account"}
            </p>
            {currentName && (
              <p className="mt-1 text-sm text-slate-300">{currentName}</p>
            )}
            {currentEmail && (
              <p className="mt-1 text-xs text-slate-500">{currentEmail}</p>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition"
            >
              Continue with this account
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full border border-slate-600 text-slate-200 font-bold py-3 rounded transition hover:bg-slate-700"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-3 pt-4">
        <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white">
          Back to home
        </Link>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/events" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">
            Events
          </Link>
          <Link href="/schools" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">
            Schools
          </Link>
          <Link href="/student/login" className="rounded-lg border border-blue-500/30 px-3 py-2 text-blue-200 hover:bg-blue-500/10">
            Student Login
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Login
        </h2>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-1">Email or Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter email or username"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-slate-400 mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Register School
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
