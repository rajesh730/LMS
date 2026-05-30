"use client";

import { useEffect } from "react";
import ChallengeShowcaseList from "@/components/challenges/ChallengeShowcaseList";
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
    <div className="text-[#17120a]">
      <ChallengeShowcaseList
        responses={responses}
        audience={seenSurface?.startsWith("student.") ? "student" : "school"}
      />
    </div>
  );
}
