import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import EventProposal from "@/models/EventProposal";
import ExternalOrganizer from "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function buildUniqueSlug(name, existingId = null) {
  const base = slugify(name) || "partner";
  let candidate = base;
  let suffix = 2;

  while (
    await ExternalOrganizer.exists({
      slug: candidate,
      ...(existingId ? { _id: { $ne: existingId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}

export async function PUT(req, props) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    const body = await req.json();
    const action = body.action || "update";

    await connectDB();
    const proposal = await EventProposal.findById(params.id);
    if (!proposal) {
      return NextResponse.json(
        { success: false, message: "Proposal not found" },
        { status: 404 }
      );
    }

    if (action === "mark_reviewing") {
      proposal.status = "UNDER_REVIEW";
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
      proposal.reviewedBy = session.user.id;
      proposal.reviewedAt = new Date();
    } else if (action === "reject") {
      proposal.status = "REJECTED";
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
      proposal.reviewedBy = session.user.id;
      proposal.reviewedAt = new Date();
    } else if (action === "approve") {
      let organizer = null;

      if (body.organizerId) {
        organizer = await ExternalOrganizer.findById(body.organizerId);
      }

      if (!organizer) {
        organizer = await ExternalOrganizer.create({
          organizationName: proposal.organizationName,
          slug: await buildUniqueSlug(proposal.organizationName),
          organizationType: proposal.organizationType,
          partnerRoles: proposal.proposedRoles,
          website: proposal.website,
          location: proposal.location,
          contactName: proposal.contactName,
          contactEmail: proposal.contactEmail,
          contactPhone: proposal.contactPhone,
          description:
            body.description ||
            `${proposal.organizationName} is an approved platform event partner.`,
          verificationStatus: "VERIFIED",
          profileVisibility: body.profileVisibility || "PRIVATE",
          trustLevel: "APPROVED_PARTNER",
          createdFromProposal: proposal._id,
          adminNotes: body.adminNotes || "",
        });
      } else {
        organizer.verificationStatus = "VERIFIED";
        organizer.trustLevel =
          organizer.trustLevel === "FEATURED_PARTNER"
            ? "FEATURED_PARTNER"
            : "APPROVED_PARTNER";
        organizer.partnerRoles = [
          ...new Set([...(organizer.partnerRoles || []), ...proposal.proposedRoles]),
        ];
        if (body.profileVisibility) {
          organizer.profileVisibility = body.profileVisibility;
        }
        await organizer.save();
      }

      proposal.status = "APPROVED";
      proposal.organizer = organizer._id;
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
      proposal.reviewedBy = session.user.id;
      proposal.reviewedAt = new Date();
    } else if (action === "link_event") {
      proposal.linkedEvent = body.eventId || null;
      proposal.status = body.eventId ? "CONVERTED_TO_EVENT" : proposal.status;
      proposal.reviewedBy = session.user.id;
      proposal.reviewedAt = new Date();
    } else {
      if (body.status) proposal.status = body.status;
      if (body.adminNotes !== undefined) proposal.adminNotes = body.adminNotes;
      if (body.organizerId !== undefined) proposal.organizer = body.organizerId || null;
      if (body.linkedEvent !== undefined) proposal.linkedEvent = body.linkedEvent || null;
      proposal.reviewedBy = session.user.id;
      proposal.reviewedAt = new Date();
    }

    await proposal.save();

    const populated = await EventProposal.findById(proposal._id)
      .populate("organizer", "organizationName slug verificationStatus profileVisibility")
      .populate("linkedEvent", "title date visibility lifecycleStatus")
      .populate("reviewedBy", "name email")
      .lean();

    return NextResponse.json({ success: true, data: populated }, { status: 200 });
  } catch (error) {
    console.error("Update event proposal error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update event proposal" },
      { status: 500 }
    );
  }
}
