import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardChallengeShowcaseClient from "@/components/challenges/DashboardChallengeShowcaseClient";
import {
  getPublicChallengeResponses,
  serializeChallengeResponse,
} from "@/lib/challengeShowcase";

export const metadata = {
  title: "Pratyo Pulse",
  description: "View selected platform challenge responses",
};

export default async function StudentChallengeShowcasePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  const responses = (await getPublicChallengeResponses()).map(
    serializeChallengeResponse
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <DashboardChallengeShowcaseClient responses={responses} />
      </div>
    </DashboardLayout>
  );
}
