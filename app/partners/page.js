import Link from "next/link";
import connectDB from "@/lib/db";
import ExternalOrganizer from "@/models/ExternalOrganizer";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";

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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition">
            Back to platform
          </Link>
          <Link
            href="/organize-event"
            className="rounded-full bg-blue-600 hover:bg-blue-500 px-5 py-2 text-sm font-bold"
          >
            Propose an event
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="max-w-3xl mb-12">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-400 mb-4">
            Partner Portfolio
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Organizations helping schools create student opportunities.
          </h1>
          <p className="text-slate-400 mt-4 text-lg">
            These are platform-approved partners connected to public student
            events, competitions, sponsorships, and published outcomes.
          </p>
        </div>

        {partners.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
            Public partner portfolios will appear here after admin approval.
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {partners.map((partner) => (
              <Link
                key={String(partner._id)}
                href={`/partners/${partner.slug}`}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {partner.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={partner.logoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black text-emerald-300">
                        {partner.organizationName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold">
                        {partner.organizationName}
                      </h2>
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1 text-xs">
                        Verified
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {(partner.partnerRoles || []).map(label).join(", ")}
                    </p>
                    {partner.description && (
                      <p className="text-slate-300 mt-4 line-clamp-3">
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
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <p className="text-xs text-slate-500 uppercase">{name}</p>
                      <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                {partner.latestEvent && (
                  <p className="text-sm text-slate-400 mt-5">
                    Latest event: {partner.latestEvent.title}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
