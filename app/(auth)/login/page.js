"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="min-h-screen bg-[#f5f1e8] p-4 text-[#17120a]">
        <div className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-3 pt-4">
          <Link href="/" className="text-sm font-semibold text-[#0a2f66] hover:underline">
            Back to home
          </Link>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/events" className="rounded-lg border border-[#d7cdbb] bg-white/70 px-3 py-2 font-semibold text-[#27344a] hover:bg-[#eaf2ff]">
              Events
            </Link>
            <Link href="/schools" className="rounded-lg border border-[#d7cdbb] bg-white/70 px-3 py-2 font-semibold text-[#27344a] hover:bg-[#eaf2ff]">
              Schools
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center">
        <div className="pratyo-card w-full max-w-md rounded-2xl p-8">
          <h2 className="mb-4 text-center text-3xl font-black text-[#17120a]">
            Already Signed In
          </h2>
          <p className="text-center text-sm leading-6 text-[#52657d]">
            This browser already has an active session. To use another account
            here, sign out first. If you need both accounts open at the same
            time, use an incognito window or a different browser profile.
          </p>

          <div className="mt-5 rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#52657d]">
              Current account
            </p>
            <p className="mt-2 text-sm font-semibold text-[#17120a]">
              {currentRole || "Signed-in account"}
            </p>
            {currentName && (
              <p className="mt-1 text-sm text-[#52657d]">{currentName}</p>
            )}
            {currentEmail && (
              <p className="mt-1 text-xs text-[#52657d]">{currentEmail}</p>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-lg bg-[#0a2f66] py-3 font-bold text-white transition hover:bg-[#123f82]"
            >
              Continue with this account
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full rounded-lg border border-[#d7cdbb] bg-white/70 py-3 font-bold text-[#27344a] transition hover:bg-[#eaf2ff]"
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
    <div className="min-h-screen bg-[#f5f1e8] p-4 text-[#17120a]">
      <div className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-between gap-3 pt-4">
        <Link href="/" className="text-sm font-semibold text-[#0a2f66] hover:underline">
          Back to home
        </Link>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/events" className="rounded-lg border border-[#d7cdbb] bg-white/70 px-3 py-2 font-semibold text-[#27344a] hover:bg-[#eaf2ff]">
            Events
          </Link>
          <Link href="/schools" className="rounded-lg border border-[#d7cdbb] bg-white/70 px-3 py-2 font-semibold text-[#27344a] hover:bg-[#eaf2ff]">
            Schools
          </Link>
          <Link href="/student/login" className="rounded-lg border border-[#2f7fdb]/30 bg-[#eaf2ff] px-3 py-2 font-semibold text-[#0a2f66] hover:bg-white">
            Student Login
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-center">
      <div className="pratyo-card w-full max-w-md rounded-2xl p-8">
        <h2 className="mb-6 text-center text-3xl font-black text-[#17120a]">
          Login
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#27344a]">Email or Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#d7cdbb] bg-white p-3 text-[#17120a] focus:outline-none focus:ring-2 focus:ring-[#2f7fdb]"
              required
              placeholder="Enter email or username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#27344a]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#d7cdbb] bg-white p-3 pr-12 text-[#17120a] focus:outline-none focus:ring-2 focus:ring-[#2f7fdb]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-[#52657d] transition hover:text-[#0a2f66]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#0a2f66] py-3 font-bold text-white transition hover:bg-[#123f82]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#52657d]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[#0a2f66] hover:underline">
            Register School
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
