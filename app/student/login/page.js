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
  { href: "/login", label: "School/Admin Login" },
];

function destinationForRole(role) {
  const destinations = {
    STUDENT: "/student/dashboard",
    SUPER_ADMIN: "/admin/dashboard",
    SCHOOL_ADMIN: "/school/dashboard",
    TEACHER: "/teacher/dashboard",
  };
  return destinations[role] || "/";
}

export default function StudentLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();

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
        window.location.assign("/student/dashboard");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return (
      <AuthShell
        links={AUTH_LINKS}
        title="Already signed in"
        description="Sign out first to log in as a student on this device, or continue with the current account."
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
            onClick={() => signOut({ callbackUrl: "/student/login" })}
          >
            Sign out and log in as student
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      links={AUTH_LINKS}
      title="Student portal"
      description="Sign in with the username and password provided by your school."
      footer={
        <p className="text-center text-sm text-[var(--brand-muted)]">
          Need help? Contact your school administrator for account support.
        </p>
      }
    >
      {error && (
        <div className="mb-4">
          <AlertBanner type="error" title="Login failed" message={error} />
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Username or email"
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username or email"
          required
          disabled={loading}
          autoComplete="username"
        />
        <PasswordInput
          label="Password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          placeholder="Enter your password"
          required
          disabled={loading}
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
        >
          School or admin login
        </Link>
      </div>
    </AuthShell>
  );
}
