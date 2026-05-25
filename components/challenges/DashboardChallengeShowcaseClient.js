"use client";

import { useEffect } from "react";
import ChallengeShowcaseList from "@/components/challenges/ChallengeShowcaseList";
import { FaFeatherAlt } from "react-icons/fa";
import PageHeader from "@/components/ui/PageHeader";
import useWorkIndicators from "@/lib/useWorkIndicators";

export default function DashboardChallengeShowcaseClient({
  responses = [],
  seenSurface = "",
}) {
  const { markSurfaceSeen } = useWorkIndicators({
    enabled: Boolean(seenSurface),
  });

  useEffect(() => {
    if (seenSurface) {
      void markSurfaceSeen(seenSurface);
    }
  }, [markSurfaceSeen, seenSurface]);

  return (
    <div className="space-y-6 text-slate-200">
      <PageHeader
        icon={FaFeatherAlt}
        eyebrow="Platform Recognition"
        title="Pratyo Pulse"
        description="Read selected student responses from platform challenges and see the schools behind them."
      />

      <ChallengeShowcaseList responses={responses} />
    </div>
  );
}
