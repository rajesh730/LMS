import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import ExternalOrganizer, { PARTNER_ROLES } from "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

const SPOTLIGHT_STATUSES = ["OFF", "ACTIVE", "PAUSED"];
const SPOTLIGHT_PRIORITIES = ["STANDARD", "FEATURED"];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}

function sanitizeRoles(roles, fallback) {
  if (!Array.isArray(roles)) return fallback || ["ORGANIZER_PARTNER"];
  const next = roles.filter((role) => PARTNER_ROLES.includes(role));
  return next.length ? next : fallback || ["ORGANIZER_PARTNER"];
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

    await connectDB();
    const organizer = await ExternalOrganizer.findById(params.id);
    if (!organizer) {
      return NextResponse.json(
        { success: false, message: "Partner not found" },
        { status: 404 }
      );
    }

    const editableFields = [
      "organizationName",
      "organizationType",
      "description",
      "logoUrl",
      "website",
      "location",
      "contactName",
      "contactEmail",
      "contactPhone",
      "verificationStatus",
      "profileVisibility",
      "trustLevel",
      "adminNotes",
    ];

    editableFields.forEach((field) => {
      if (body[field] !== undefined) {
        organizer[field] = body[field];
      }
    });

    if (body.slug !== undefined) {
      organizer.slug = slugify(body.slug || organizer.organizationName);
    }

    if (body.partnerRoles !== undefined) {
      organizer.partnerRoles = sanitizeRoles(body.partnerRoles, organizer.partnerRoles);
    }

    if (body.spotlightStatus !== undefined) {
      if (!SPOTLIGHT_STATUSES.includes(body.spotlightStatus)) {
        return NextResponse.json(
          { success: false, message: "Invalid spotlight status" },
          { status: 400 }
        );
      }
      organizer.spotlightStatus = body.spotlightStatus;
    }

    if (body.spotlightPriority !== undefined) {
      if (!SPOTLIGHT_PRIORITIES.includes(body.spotlightPriority)) {
        return NextResponse.json(
          { success: false, message: "Invalid spotlight priority" },
          { status: 400 }
        );
      }
      organizer.spotlightPriority = body.spotlightPriority;
    }

    if (
      organizer.spotlightStatus !== "OFF" &&
      organizer.verificationStatus !== "VERIFIED"
    ) {
      if (body.spotlightStatus && body.spotlightStatus !== "OFF") {
        return NextResponse.json(
          {
            success: false,
            message: "Approve this partner before showing it on the homepage.",
          },
          { status: 400 }
        );
      }

      organizer.spotlightStatus = "OFF";
    }

    await organizer.save();

    return NextResponse.json({ success: true, data: organizer }, { status: 200 });
  } catch (error) {
    console.error("Update organizer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update partner" },
      { status: 500 }
    );
  }
}
