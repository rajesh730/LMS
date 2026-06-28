"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import AuthShell, { AuthSessionPanel } from "@/components/auth/AuthShell";
import Button, { ButtonLink } from "@/components/ui/Button";
import Input, { PasswordInput } from "@/components/ui/Input";
import AlertBanner from "@/components/ui/AlertBanner";

const AUTH_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/schools", label: "Schools" },
  { href: "/student/login", label: "Student Login", highlight: true },
];

function destinationForRole(role) {
  const destinations = {
    SUPER_ADMIN: "/admin/dashboard",
    SCHOOL_ADMIN: "/school/dashboard",
    TEACHER: "/teacher/dashboard",
    STUDENT: "/student/dashboard",
  };
  return destinations[role] || "/school/dashboard";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { status, data: session } = useSession();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (res.error) {
        setError("Invalid credentials. Please check your email and password.");
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();

      if (sessionData?.user) {
        window.location.assign(destinationForRole(sessionData.user.role));
      } else {
        window.location.assign("/school/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return (
      <AuthShell
        links={AUTH_LINKS}
        title="Already signed in"
        description="This browser already has an active session. Sign out first to use another account, or continue with the current one."
      >
        <AuthSessionPanel
          role={String(session?.user?.role || "").replaceAll("_", " ")}
          name={session?.user?.name}
          email={session?.user?.email}
        />
        <div className="mt-6 space-y-3">
          <ButtonLink
            fullWidth
            href={destinationForRole(session?.user?.role)}
          >
            Continue with this account
          </ButtonLink>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out and use another account
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      links={AUTH_LINKS}
      title="Sign in"
      description="Sign in to manage your school, events, notices, and student activities."
      footer={
        <p className="text-center text-sm text-[var(--brand-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[var(--brand-primary)] hover:underline">
            Register your school
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4">
          <AlertBanner type="error" message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email or username"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email or username"
          required
          disabled={loading}
          autoComplete="username"
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
