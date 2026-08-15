"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import AuthShell, { AuthSessionPanel } from "@/components/auth/AuthShell";
import Button, { ButtonLink } from "@/components/ui/Button";
import Input, { PasswordInput } from "@/components/ui/Input";
import AlertBanner from "@/components/ui/AlertBanner";
import RoleChooser from "./RoleChooser";

const AUTH_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/schools", label: "Schools" },
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
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  // /login shows "who is signing in?" first. ?as=school jumps straight to the
  // staff form, which is where the School tile points and where any existing
  // bookmark or redirect still lands.
  const showStaffForm = searchParams.get("as") === "school";

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

  // Everyone lands here first. Sending a parent straight to an email/password
  // form they can never complete was the single biggest sign-in dead end.
  if (!showStaffForm) {
    return (
      <AuthShell
        links={AUTH_LINKS}
        title="Sign in to Pravyo"
        description="Choose how you use Pravyo."
        footer={
          <p className="text-center text-sm text-[var(--brand-muted)]">
            New school?{" "}
            <Link
              href="/register"
              className="font-semibold text-[var(--brand-primary)] hover:underline"
            >
              Register your school
            </Link>
          </p>
        }
      >
        <RoleChooser />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      links={AUTH_LINKS}
      title="School sign in"
      description="For teachers and school administrators."
      footer={
        <div className="space-y-3 text-center text-sm text-[var(--brand-muted)]">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[var(--brand-primary)] hover:underline">
              Register your school
            </Link>
          </p>
          <p>
            <Link href="/login" className="font-semibold text-[var(--brand-primary)] hover:underline">
              ← Not a school? Choose again
            </Link>
          </p>
        </div>
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
          id="email"
          name="email"
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
          id="password"
          name="password"
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
