"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const role = session?.user?.role;
      if (role === "SUPER_ADMIN") router.replace("/admin/dashboard");
      else if (role === "SCHOOL_ADMIN") router.replace("/school/dashboard");
      else if (role === "TEACHER") router.replace("/teacher/dashboard");
      else if (role === "STUDENT") router.replace("/student/dashboard");
      else router.replace("/");
    }
  }, [status, session, router]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
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
            <label className="block text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Register School
          </Link>
        </p>
      </div>
    </div>
  );
}
