import ChallengeShowcaseList from "@/components/challenges/ChallengeShowcaseList";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  PublicContainer,
  PublicHero,
  PublicPageShell,
  PublicStatTile,
} from "@/components/public/PublicLayout";
import {
  getPublicChallengeResponses,
  serializeChallengeResponse,
} from "@/lib/challengeShowcase";
import { FaFeatherAlt, FaSchool, FaStar } from "react-icons/fa";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pratyo Pulse",
  description: "Selected student responses from Pratyo platform challenges",
};

export default async function PublicChallengesPage() {
  const responses = (await getPublicChallengeResponses()).map(
    serializeChallengeResponse
  );
  const schoolCount = new Set(
    responses.map((response) => response.school?.id).filter(Boolean)
  ).size;

  return (
    <PublicPageShell className="bg-[#f8fbff]">
      <PublicSiteNav active="writings" />
      <PublicHero
        eyebrow="Pratyo Pulse"
        title="Featured Student Responses"
        description="Read selected student writing from platform challenges and discover the schools encouraging student voice."
        stats={
          <div className="grid gap-3">
            <PublicStatTile
              label="Featured Responses"
              value={responses.length}
              icon={FaStar}
            />
            <PublicStatTile
              label="Schools Represented"
              value={schoolCount}
              icon={FaSchool}
            />
            <PublicStatTile
              label="Student Writing"
              value="Public"
              icon={FaFeatherAlt}
            />
          </div>
        }
      />
      <PublicContainer className="py-6">
        <ChallengeShowcaseList responses={responses} audience="public" />
      </PublicContainer>
    </PublicPageShell>
  );
}
