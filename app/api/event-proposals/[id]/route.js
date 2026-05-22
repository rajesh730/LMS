import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventProposal, { EVENT_PROPOSAL_ROLES } from "@/models/EventProposal";
import ExternalOrganizer from "@/models/ExternalOrganizer";
import { syncEventSchoolInvitations } from "@/lib/eventInvitations";
import { validateEventDates } from "@/lib/eventDates";

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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function sanitizeRoles(value) {
  const roles = normalizeList(value).filter((role) =>
    EVENT_PROPOSAL_ROLES.includes(role)
  );
  return roles.length ? roles : ["ORGANIZER_PARTNER"];
}

function optionalNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : null;
}

function buildEventPartnerFromProposal(proposal, organizer) {
  return {
    organizer: organizer._id,
    role: proposal.proposedRoles?.[0] || "ORGANIZER_PARTNER",
    displayName: organizer.organizationName || proposal.organizationName || "",
    logoUrl: organizer.logoUrl || "",
    website: organizer.website || proposal.website || "",
    isPrimary: true,
  };
}

function recordStatusChange(proposal, nextStatus, session, action, note = "") {
  const previousStatus = proposal.status;
  if (previousStatus === nextStatus) return;

  proposal.statusHistory = proposal.statusHistory || [];
  proposal.statusHistory.push({
    from: previousStatus,
    to: nextStatus,
    action,
    note,
    changedBy: session.user.id,
    changedAt: new Date(),
  });
  proposal.status = nextStatus;
  proposal.reviewedBy = session.user.id;
  proposal.reviewedAt = new Date();
  proposal.archivedAt = nextStatus === "ARCHIVED" ? new Date() : null;
}

async function approveOrganizerForProposal(proposal, body) {
  let organizer = null;

  if (body.organizerId) {
    organizer = await ExternalOrganizer.findById(body.organizerId);
  }

  if (!organizer) {
    const proposalEmail = normalizeEmail(proposal.contactEmail);
    organizer = proposalEmail
      ? await ExternalOrganizer.findOne({ contactEmail: proposalEmail })
      : null;
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
    organizer.organizationName =
      organizer.organizationName || proposal.organizationName;
    organizer.organizationType =
      organizer.organizationType || proposal.organizationType;
    organizer.website = organizer.website || proposal.website;
    organizer.location = organizer.location || proposal.location;
    organizer.contactName = organizer.contactName || proposal.contactName;
    organizer.contactEmail =
      normalizeEmail(organizer.contactEmail) || normalizeEmail(proposal.contactEmail);
    organizer.contactPhone = organizer.contactPhone || proposal.contactPhone;
    if (body.profileVisibility) {
      organizer.profileVisibility = body.profileVisibility;
    }
    await organizer.save();
  }

  proposal.organizer = organizer._id;
  return organizer;
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
      recordStatusChange(
        proposal,
        "UNDER_REVIEW",
        session,
        action,
        body.adminNotes || ""
      );
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
    } else if (action === "decline" || action === "reject") {
      recordStatusChange(
        proposal,
        "DECLINED",
        session,
        action,
        body.adminNotes || ""
      );
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
    } else if (action === "approve_partner" || action === "approve") {
      await approveOrganizerForProposal(proposal, body);
      recordStatusChange(
        proposal,
        "APPROVED",
        session,
        action,
        body.adminNotes || ""
      );
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
    } else if (action === "publish_event") {
      if (proposal.status !== "APPROVED") {
        return NextResponse.json(
          {
            success: false,
            message: "Approve this partner before publishing the event.",
          },
          { status: 400 }
        );
      }

      const eventDate = body.eventDate || proposal.preferredDate;
      if (!proposal.linkedEvent) {
        const dateValidationMessage = validateEventDates({
          date: eventDate,
          registrationDeadline: body.registrationDeadline || null,
        });

        if (dateValidationMessage) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Set a valid future event date before publishing this proposal as a platform event.",
            },
            { status: 400 }
          );
        }
      }

      const organizer = await approveOrganizerForProposal(proposal, body);
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;

      if (!proposal.linkedEvent) {
        const linkedEvent = await Event.create({
          title: proposal.eventTitle,
          description: proposal.eventDescription,
          date: eventDate,
          createdBy: session.user.id,
          school: null,
          eventScope: "PLATFORM",
          ownerType: "PLATFORM",
          ownerId: session.user.id,
          eventType: "COMPETITION",
          visibility: "PUBLIC",
          registrationMode: "THROUGH_SCHOOL",
          status: "APPROVED",
          lifecycleStatus: "ACTIVE",
          publicHighlightsEnabled: true,
          partnerBrandingEnabled: true,
          sourceProposal: proposal._id,
          partners: [buildEventPartnerFromProposal(proposal, organizer)],
          registrationDeadline: body.registrationDeadline || null,
          maxParticipants: proposal.expectedStudents || null,
          maxParticipantsPerSchool: null,
          eligibleGrades: proposal.targetGrades || [],
        });

        proposal.linkedEvent = linkedEvent._id;
        recordStatusChange(
          proposal,
          "CONVERTED_TO_EVENT",
          session,
          action,
          body.adminNotes || ""
        );

        try {
          await syncEventSchoolInvitations(linkedEvent._id, {
            createdBy: session.user.id,
          });
        } catch (invitationError) {
          console.error("Sync proposal event invitations error:", invitationError);
        }
      } else {
        recordStatusChange(
          proposal,
          "CONVERTED_TO_EVENT",
          session,
          action,
          body.adminNotes || ""
        );
      }
    } else if (action === "reopen") {
      if (proposal.linkedEvent || proposal.status === "CONVERTED_TO_EVENT") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Published proposals cannot be reopened. Archive them if they no longer need attention.",
          },
          { status: 400 }
        );
      }

      recordStatusChange(
        proposal,
        "UNDER_REVIEW",
        session,
        action,
        body.adminNotes || ""
      );
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
    } else if (action === "archive") {
      recordStatusChange(
        proposal,
        "ARCHIVED",
        session,
        action,
        body.adminNotes || ""
      );
      proposal.adminNotes = body.adminNotes ?? proposal.adminNotes;
    } else if (action === "link_event") {
      proposal.linkedEvent = body.eventId || null;
      if (body.eventId) {
        recordStatusChange(
          proposal,
          "CONVERTED_TO_EVENT",
          session,
          action,
          body.adminNotes || ""
        );
      }
    } else {
      if (body.status) {
        const allowedStatuses = [
          "NEW",
          "UNDER_REVIEW",
          "APPROVED",
          "DECLINED",
          "REJECTED",
          "CONVERTED_TO_EVENT",
          "ARCHIVED",
        ];
        if (!allowedStatuses.includes(body.status)) {
          return NextResponse.json(
            { success: false, message: "Invalid proposal status" },
            { status: 400 }
          );
        }
        recordStatusChange(
          proposal,
          body.status,
          session,
          action,
          body.adminNotes || ""
        );
      }
      if (body.adminNotes !== undefined) proposal.adminNotes = body.adminNotes;
      if (body.organizerId !== undefined) proposal.organizer = body.organizerId || null;
      if (body.linkedEvent !== undefined) proposal.linkedEvent = body.linkedEvent || null;
      
      // Allow editing proposal details
      if (body.eventTitle !== undefined) proposal.eventTitle = body.eventTitle;
      if (body.eventDescription !== undefined) proposal.eventDescription = body.eventDescription;
      if (body.organizationName !== undefined) proposal.organizationName = body.organizationName;
      if (body.organizationType !== undefined) proposal.organizationType = body.organizationType;
      if (body.contactName !== undefined) proposal.contactName = body.contactName;
      if (body.contactEmail !== undefined) proposal.contactEmail = body.contactEmail;
      if (body.contactPhone !== undefined) proposal.contactPhone = body.contactPhone;
      if (body.website !== undefined) proposal.website = body.website;
      if (body.location !== undefined) proposal.location = body.location;
      if (body.eventMode !== undefined) proposal.eventMode = body.eventMode;
      if (body.venue !== undefined) proposal.venue = body.venue;
      if (body.preferredDate !== undefined) proposal.preferredDate = body.preferredDate || null;
      if (body.expectedStudents !== undefined) proposal.expectedStudents = optionalNumber(body.expectedStudents);
      if (body.expectedSchools !== undefined) proposal.expectedSchools = optionalNumber(body.expectedSchools);
      if (body.targetGrades !== undefined) proposal.targetGrades = normalizeList(body.targetGrades);
      if (body.proposedRoles !== undefined) proposal.proposedRoles = sanitizeRoles(body.proposedRoles);
      if (body.prizeDetails !== undefined) proposal.prizeDetails = body.prizeDetails;
      if (body.dataAccessNeeds !== undefined) proposal.dataAccessNeeds = body.dataAccessNeeds;
      if (body.safetyNotes !== undefined) proposal.safetyNotes = body.safetyNotes;
      proposal.reviewedBy = session.user.id;
      proposal.reviewedAt = new Date();
    }

    await proposal.save();

    const populated = await EventProposal.findById(proposal._id)
      .populate("organizer", "organizationName slug verificationStatus profileVisibility")
      .populate("linkedEvent", "title date visibility lifecycleStatus")
      .populate("reviewedBy", "name email")
      .populate("statusHistory.changedBy", "name email")
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
