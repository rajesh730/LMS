"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FaUserShield, FaSearch } from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import GuardianManager from "@/components/school/GuardianManager";

/**
 * School-side guardian management (§19, §20, §27).
 *
 * The school is the authorisation source for every parent↔child link, so this
 * is where those links are created, permissioned and revoked. Nothing in the
 * Parent App can grant a guardian access to a student.
 *
 * Restricted to SCHOOL_ADMIN and SUPER_ADMIN — not teachers. Granting a person
 * access to a child's record is a safeguarding decision, not a classroom one.
 */
export default function SchoolGuardiansPage() {
  const { data: session, status } = useSession();

  const [query, setQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async (term) => {
    setSearching(true);
    setError("");
    try {
      const url = new URL("/api/students", window.location.origin);
      url.searchParams.set("limit", "20");
      if (term.trim()) url.searchParams.set("search", term.trim());

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load students");

      // /api/students predates lib/apiResponse and returns { students, pagination }
      // at the top level rather than inside a `data` envelope.
      setStudents(json.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return undefined;

    // Debounced so typing a name does not fire a query per keystroke against
    // an Atlas cluster with ~69ms RTT.
    const handle = setTimeout(() => search(query), 350);
    return () => clearTimeout(handle);
  }, [query, search, status]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState title="Loading" message="Opening guardian management." />
      </DashboardLayout>
    );
  }

  if (!["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session?.user?.role)) {
    return (
      <DashboardLayout>
        <AlertBanner
          type="error"
          title="School administrator access required"
          message="Only a school administrator can manage guardian access to a student's record."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          icon={FaUserShield}
          eyebrow="School"
          title="Parent & Guardian Access"
          description="Invite guardians to the Parent App, set what each one may do, and revoke access when it should end."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside>
            <label htmlFor="student-search" className="sr-only">
              Search students
            </label>
            <div className="relative">
              <FaSearch
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]"
              />
              <input
                id="student-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or roll number"
                className="min-h-[48px] w-full rounded-xl border border-[var(--brand-border)] pl-10 pr-4 text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>

            {error ? (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </p>
            ) : null}

            <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
              {searching && students.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--brand-muted)]">
                  Searching…
                </li>
              ) : null}

              {students.map((student) => {
                const id = String(student._id || student.id);
                const active = selected?.id === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected({
                          id,
                          name: student.name,
                          grade: student.grade,
                        })
                      }
                      className={[
                        "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                        active
                          ? "bg-[var(--brand-primary-soft)]"
                          : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-semibold text-[var(--brand-ink)]">
                        {student.name}
                      </span>
                      <span className="block text-xs text-[var(--brand-muted)]">
                        {[student.grade, student.rollNumber]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                );
              })}

              {!searching && students.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--brand-muted)]">
                  No students found.
                </li>
              ) : null}
            </ul>
          </aside>

          <section>
            {selected ? (
              // Keyed by student so selecting a different child remounts the
              // panel. That resets its state cleanly — most importantly the
              // one-time invitation code, which must never linger on screen
              // after the admin has moved to another student.
              <GuardianManager key={selected.id} student={selected} />
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--brand-border)] px-6 py-16 text-center">
                <p className="text-3xl" aria-hidden="true">
                  👨‍👩‍👧
                </p>
                <p className="mt-3 font-semibold text-[var(--brand-ink)]">
                  Choose a student
                </p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  Select a student to see and manage their guardians.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
