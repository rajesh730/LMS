import Link from "next/link";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import "@/models/ExternalOrganizer";

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

  return (
    <main className="min-h-screen bg-[#08111f] text-white">
      <PublicSiteNav active="events" />
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 md:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,.22),transparent_32%),radial-gradient(circle_at_76%_18%,rgba(167,139,250,.18),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300 mb-4">
              Public Events
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Discover talent showcases, competitions, and school events before login
            </h1>
            <p className="text-slate-300 mt-4 text-lg leading-8">
              Explore what schools and the platform are organizing across music,
              debate, arts, innovation, and more.
            </p>
          </div>
          <svg
            viewBox="0 0 360 260"
            aria-hidden="true"
            className="hidden h-64 w-full lg:block"
          >
            <defs>
              <linearGradient id="eventPageAccent" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <rect x="22" y="24" width="316" height="214" rx="28" fill="#0f1b2d" stroke="#334155" />
            <path d="M65 75h165M65 116h230M65 157h128" stroke="#64748b" strokeLinecap="round" strokeWidth="16" />
            <circle cx="278" cy="80" r="34" fill="url(#eventPageAccent)" />
            <path d="M252 172l23 22 50-62" fill="none" stroke="#f8fafc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="13" />
          </svg>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 md:px-12">
        {featuredEvents.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl font-bold mb-6">Featured Events</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              {featuredEvents.map((event) => (
                <Link
                  key={String(event._id)}
                  href={`/events/${event._id}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 transition hover:border-sky-400/50 hover:bg-white/[0.08]"
                >
                  {(() => {
                    const partnerName = getVisiblePartnerName(event);
                    return (
                      <>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      Featured
                    </span>
                    <div className="flex items-center gap-2">
                      {event.resultsPublished && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 uppercase">
                          Results Published
                        </span>
                      )}
                      <span className="text-xs text-slate-400 uppercase">
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{event.title}</h3>
                  <p className="text-slate-400 mt-3 line-clamp-3">
                    {event.description}
                  </p>
                  <div className="mt-5 text-sm text-slate-300 space-y-1">
                    <div>Date: {new Date(event.date).toLocaleDateString()}</div>
                    {partnerName && (
                      <div>
                        Partner: {partnerName}
                      </div>
                    )}
                    <div>
                      Organizer:{" "}
                      {event.eventScope === "PLATFORM"
                        ? "Platform"
                        : event.school?.schoolName || "School event"}
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-6">All Public Events</h2>
          {publicEvents.length === 0 && visibleAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 text-slate-400">
              Public events will appear here after they are published or approved as partner announcements.
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {visibleAnnouncements.map((proposal) => {
                const partnerName = getVisibleProposalPartnerName(proposal);

                return (
                  <article
                    key={String(proposal._id)}
                    className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] p-6"
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <span className="text-xs uppercase text-sky-300">
                        Announced
                      </span>
                      <span className="text-xs uppercase text-slate-400">
                        {proposal.eventMode || "Event"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold">{proposal.eventTitle}</h3>
                    <p className="text-slate-400 mt-3 line-clamp-3">
                      {proposal.eventDescription}
                    </p>
                    <div className="mt-5 text-sm text-slate-300">
                      <div>
                        Date:{" "}
                        {proposal.preferredDate
                          ? new Date(proposal.preferredDate).toLocaleDateString()
                          : "To be announced"}
                      </div>
                      {partnerName && (
                        <div className="mt-1 text-emerald-300">
                          Organized by {partnerName}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {publicEvents.map((event) => (
              <Link
                key={String(event._id)}
                href={`/events/${event._id}`}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 transition hover:border-emerald-400/50 hover:bg-white/[0.08]"
              >
                {(() => {
                  const partnerName = getVisiblePartnerName(event);
                  return (
                    <>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="text-xs uppercase text-slate-400">
                    {event.eventScope}
                  </span>
                  <div className="flex items-center gap-2">
                    {event.resultsPublished && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 uppercase">
                        Results
                      </span>
                    )}
                    <span className="text-xs uppercase text-slate-400">
                      {event.eventType}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{event.title}</h3>
                <p className="text-slate-400 mt-3 line-clamp-3">{event.description}</p>
                <div className="mt-5 text-sm text-slate-300">
                  <div>Date: {new Date(event.date).toLocaleDateString()}</div>
                  {partnerName && (
                    <div className="mt-1 text-emerald-300">
                      In partnership with {partnerName}
                    </div>
                  )}
                </div>
                    </>
                  );
                })()}
              </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
