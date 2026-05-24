import Link from "next/link";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  PublicBadge,
  PublicCard,
  PublicContainer,
  PublicHero,
  PublicPageShell,
  PublicSectionHeader,
  PublicStatTile,
} from "@/components/public/PublicLayout";
import "@/models/ExternalOrganizer";
import {
  FaBullhorn,
  FaCalendarAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

function getVisiblePartnerName(event) {
  if (!event.partnerBrandingEnabled || !Array.isArray(event.partners)) {
    return "";
  }

  const partner = event.partners.find(
    (entry) =>
      entry?.organizer?.profileVisibility === "PUBLIC" || entry?.displayName
  );

  if (!partner) return "";

  return (
    partner.organizer?.organizationName ||
    partner.displayName ||
    "Approved partner"
  );
}

function getVisibleProposalPartnerName(proposal) {
  const organizer = proposal.organizer;
  if (!organizer || organizer.profileVisibility !== "PUBLIC") {
    return "";
  }

  return organizer.organizationName || proposal.organizationName || "";
}

function formatDate(value) {
  if (!value) return "To be announced";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EventBadge({ children, tone = "slate" }) {
  const toneMap = {
    blue: "soft",
    emerald: "success",
    amber: "result",
    slate: "white",
  };

  return <PublicBadge tone={toneMap[tone] || "white"}>{children}</PublicBadge>;
}

export default async function PublicEventsPage() {
  await connectDB();

  const [featuredEvents, publicEvents, announcedProposals] = await Promise.all([
    Event.find({
      visibility: "PUBLIC",
      status: "APPROVED",
      lifecycleStatus: { $ne: "ARCHIVED" },
      featuredOnLanding: true,
    })
      .sort({ date: 1 })
      .limit(4)
      .populate("school", "schoolName")
      .populate(
        "partners.organizer",
        "organizationName slug logoUrl website verificationStatus profileVisibility"
      )
      .lean(),
    Event.find({
      visibility: "PUBLIC",
      status: "APPROVED",
      lifecycleStatus: { $ne: "ARCHIVED" },
    })
      .sort({ date: 1 })
      .limit(24)
      .populate("school", "schoolName")
      .populate(
        "partners.organizer",
        "organizationName slug logoUrl website verificationStatus profileVisibility"
      )
      .lean(),
    EventProposal.find({
      status: "APPROVED",
      linkedEvent: null,
      organizer: { $ne: null },
    })
      .sort({ preferredDate: 1, createdAt: -1 })
      .limit(12)
      .populate(
        "organizer",
        "organizationName slug verificationStatus profileVisibility"
      )
      .lean(),
  ]);

  const visibleAnnouncements = announcedProposals.filter(
    (proposal) =>
      proposal.organizer?.verificationStatus === "VERIFIED" &&
      proposal.organizer?.profileVisibility === "PUBLIC"
  );
  const resultCount = publicEvents.filter((event) => event.resultsPublished).length;

  return (
    <PublicPageShell>
      <PublicSiteNav active="events" />
      <PublicHero
        eyebrow="Public Events"
        title="Competitions, showcases, and school events"
        description="Browse public events, partner announcements, and published results before login."
        stats={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <PublicStatTile label="Public events" value={publicEvents.length} icon={FaCalendarAlt} />
            <PublicStatTile label="Featured" value={featuredEvents.length} icon={FaBullhorn} />
            <PublicStatTile label="Results" value={resultCount} icon={FaTrophy} className="col-span-2 lg:col-span-1" />
          </div>
        }
      />

      <PublicContainer className="py-6 sm:py-8">
        {featuredEvents.length > 0 && (
          <section className="mb-10">
            <PublicSectionHeader
              eyebrow="Recommended"
              title="Featured Events"
              description="Highlighted competitions and school activity records."
            />
            <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
              {featuredEvents.map((event) => (
                <PublicCard
                  as={Link}
                  key={String(event._id)}
                  href={`/events/${event._id}`}
                  flushMobile
                  className="hover:-translate-y-0.5 hover:border-[#2f7fdb]/45"
                >
                  {(() => {
                    const partnerName = getVisiblePartnerName(event);
                    return (
                      <>
                  <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-4">
                    <EventBadge tone="blue">Featured</EventBadge>
                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                      {event.resultsPublished && (
                        <EventBadge tone="amber">Results Published</EventBadge>
                      )}
                      <EventBadge>{event.eventType}</EventBadge>
                    </div>
                  </div>
                  <h3 className="break-words text-xl font-black text-slate-950 sm:text-2xl">{event.title}</h3>
                  <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-600">
                    {event.description}
                  </p>
                  <div className="mt-5 space-y-2 text-sm font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-[#0a2f66]" />
                      {formatDate(event.date)}
                    </div>
                    {partnerName && (
                      <div>
                        Partner: {partnerName}
                      </div>
                    )}
                    <div className="break-words">
                      Organizer:{" "}
                      {event.eventScope === "PLATFORM"
                        ? "Platform"
                        : event.school?.schoolName || "School event"}
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </PublicCard>
              ))}
            </div>
          </section>
        )}

        <section>
          <PublicSectionHeader
            eyebrow="Browse"
            title="All Public Events"
            description="Events here are visible before login so schools and visitors can understand what is happening on the platform."
          />
          {publicEvents.length === 0 && visibleAnnouncements.length === 0 ? (
            <PublicCard flushMobile className="text-slate-600">
              Public events will appear here after they are published or approved as partner announcements.
            </PublicCard>
          ) : (
            <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
              {visibleAnnouncements.map((proposal) => {
                const partnerName = getVisibleProposalPartnerName(proposal);

                return (
                  <PublicCard
                    key={String(proposal._id)}
                    flushMobile
                    className="border-[#bfd7f7] bg-[#f8fbff]"
                  >
                    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-4">
                      <EventBadge tone="blue">
                        <span className="inline-flex items-center gap-2">
                          <FaBullhorn />
                          Announced
                        </span>
                      </EventBadge>
                      <EventBadge>{proposal.eventMode || "Event"}</EventBadge>
                    </div>
                    <h3 className="break-words text-xl font-black text-slate-950">{proposal.eventTitle}</h3>
                    <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-600">
                      {proposal.eventDescription}
                    </p>
                    <div className="mt-5 text-sm font-semibold text-slate-600">
                      <div>
                        Date: {formatDate(proposal.preferredDate)}
                      </div>
                      {partnerName && (
                        <div className="mt-1 text-[#0a2f66]">
                          Organized by {partnerName}
                        </div>
                      )}
                    </div>
                  </PublicCard>
                );
              })}

              {publicEvents.map((event) => (
              <PublicCard
                as={Link}
                key={String(event._id)}
                href={`/events/${event._id}`}
                flushMobile
                className="hover:-translate-y-0.5 hover:border-[#2f7fdb]/45"
              >
                {(() => {
                  const partnerName = getVisiblePartnerName(event);
                  return (
                    <>
                <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-4">
                  <EventBadge tone={event.eventScope === "PLATFORM" ? "blue" : "emerald"}>
                    {event.eventScope}
                  </EventBadge>
                  <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                    {event.resultsPublished && (
                      <EventBadge tone="amber">
                        <span className="inline-flex items-center gap-2">
                          <FaTrophy />
                          Results
                        </span>
                      </EventBadge>
                    )}
                    <EventBadge>{event.eventType}</EventBadge>
                  </div>
                </div>
                <h3 className="break-words text-xl font-black text-slate-950">{event.title}</h3>
                <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-600">{event.description}</p>
                <div className="mt-5 text-sm font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-[#0a2f66]" />
                    {formatDate(event.date)}
                  </div>
                  {event.eligibleGrades?.length > 0 && (
                    <div className="mt-2 flex min-w-0 items-start gap-2 break-words text-slate-600">
                      <FaUsers className="mt-1 text-[#0a2f66]" />
                      <span className="min-w-0 break-words">
                        {event.eligibleGrades.join(", ")}
                      </span>
                    </div>
                  )}
                  {partnerName && (
                    <div className="mt-2 break-words text-[#0a2f66]">
                      In partnership with {partnerName}
                    </div>
                  )}
                </div>
                    </>
                  );
                })()}
              </PublicCard>
              ))}
            </div>
          )}
        </section>
      </PublicContainer>
    </PublicPageShell>
  );
}
