"use client";

import ChallengeShowcaseList from "@/components/challenges/ChallengeShowcaseList";
import { FaFeatherAlt } from "react-icons/fa";
import PageHeader from "@/components/ui/PageHeader";

export default function DashboardChallengeShowcaseClient({ responses = [] }) {
  return (
    <div className="space-y-6 text-slate-200">
      <PageHeader
        icon={FaFeatherAlt}
        eyebrow="Platform Recognition"
        title="Challenge Showcase"
        description="Read selected student responses from platform challenges and see the schools behind them."
      />

      <ChallengeShowcaseList responses={responses} />
    </div>
  );
}
