"use client";

import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import GuardianRoster from "@/components/school/GuardianRoster";

/**
 * School-side guardian management.
 *
 * A full roster rather than the search-one-student flow this replaced: the
 * question a school admin arrives with is "which of my students has nobody
 * connected?", which a master/detail screen cannot answer at any scale.
 *
 * Restricted to SCHOOL_ADMIN and SUPER_ADMIN — not teachers. Granting a person
 * access to a child's record is an administrative decision with safeguarding
 * consequences, not a classroom one.
 */
export default function SchoolGuardiansPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState
          title="Loading"
          message="Opening parents and guardians."
        />
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
      <GuardianRoster />
    </DashboardLayout>
  );
}
