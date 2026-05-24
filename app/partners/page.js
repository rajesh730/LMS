import Link from "next/link";
import connectDB from "@/lib/db";
import ExternalOrganizer from "@/models/ExternalOrganizer";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  PublicBadge,
  PublicCard,
  PublicContainer,
  PublicHero,
  PublicPageShell,
  PublicStatTile,
  PublicTextLink,
} from "@/components/public/PublicLayout";
import { FaCalendarAlt, FaHandshake, FaSchool, FaUsers } from "react-icons/fa";

export const dynamic = "force-dynamic";

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

async function getPartners() {
  await connectDB();

  const organizers = await ExternalOrganizer.find({
    verificationStatus: "VERIFIED",
    profileVisibility: "PUBLIC",
  })
    .sort({ trustLevel: 1, organizationName: 1 })
    .lean();

  const partners = await Promise.all(
    organizers.map(async (organizer) => {
      const events = await Event.find({
        "partners.organizer": organizer._id,
        partnerBrandingEnabled: true,
        visibility: "PUBLIC",
        status: "APPROVED",
        lifecycleStatus: { $ne: "ARCHIVED" },
      })
        .select("_id title date eventType lifecycleStatus resultsPublished")
        .sort({ date: -1 })
        .lean();

      const eventIds = events.map((event) => event._id);
      const requests = eventIds.length
        ? await ParticipationRequest.find({
            event: { $in: eventIds },
            status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
          })
            .select("school")
            .lean()
        : [];

      return {
        ...organizer,
        eventCount: events.length,
        studentCount: requests.length,
        schoolCount: new Set(requests.map((request) => String(request.school))).size,
        latestEvent: events[0] || null,
      };
    })
  );

  return partners;
}

export default async function PartnersPage() {
  const partners = await getPartners();
  const totals = partners.reduce(
    (summary, partner) => ({
      events: summary.events + partner.eventCount,
      schools: summary.schools + partner.schoolCount,
      students: summary.students + partner.studentCount,
    }),
    { events: 0, schools: 0, students: 0 }
  );

  return (
    <PublicPageShell>
      <PublicSiteNav active="partners" />

      <PublicHero
        eyebrow="Partner Portfolio"
        title="Organizations helping schools create opportunities"
        description="Platform-approved partners connected to public student events, competitions, sponsorships, and published outcomes."
        action={<PublicTextLink href="/organize-event">Propose an event</PublicTextLink>}
        stats={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <PublicStatTile label="Partners" value={partners.length} icon={FaHandshake} />
            <PublicStatTile label="Events" value={totals.events} icon={FaCalendarAlt} />
            <PublicStatTile label="Schools" value={totals.schools} icon={FaSchool} className="col-span-2 lg:col-span-1" />
          </div>
        }
      />

      <PublicContainer className="py-6 sm:py-8">
        {partners.length === 0 ? (
          <PublicCard flushMobile className="p-8 text-slate-600">
            Public partner portfolios will appear here after admin approval.
          </PublicCard>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {partners.map((partner) => (
              <PublicCard
                as={Link}
                key={String(partner._id)}
                href={`/partners/${partner.slug}`}
                flushMobile
                className="hover:-translate-y-0.5 hover:border-[#2f7fdb]/45"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-[#eaf2ff] border border-[#cfe0f6] overflow-hidden flex items-center justify-center shrink-0 text-[#0a2f66]">
                    {partner.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={partner.logoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black">
                        {partner.organizationName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="break-words text-2xl font-black text-slate-950">
                        {partner.organizationName}
                      </h2>
                      <PublicBadge tone="success">Verified</PublicBadge>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      {(partner.partnerRoles || []).map(label).join(", ")}
                    </p>
                    {partner.description && (
                      <p className="text-slate-600 mt-4 line-clamp-3">
                        {partner.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    ["Events", partner.eventCount],
                    ["Schools", partner.schoolCount],
                    ["Students", partner.studentCount],
                  ].map(([name, value]) => (
                    <div
                      key={name}
                      className="rounded-2xl border border-[#d7e5f7] bg-[#f8fbff] p-4"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{name}</p>
                      <p className="text-2xl font-black mt-1 text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                {partner.latestEvent && (
                  <p className="text-sm font-semibold text-[#0a2f66] mt-5">
                    Latest event: {partner.latestEvent.title}
                  </p>
                )}
              </PublicCard>
            ))}
          </div>
        )}
      </PublicContainer>
    </PublicPageShell>
  );
}
