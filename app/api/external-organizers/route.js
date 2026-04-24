import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import ExternalOrganizer, { PARTNER_ROLES } from "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function buildUniqueSlug(name) {
  const base = slugify(name) || "partner";
  let candidate = base;
  let suffix = 2;

  while (await ExternalOrganizer.exists({ slug: candidate })) {
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

function sanitizeRoles(roles) {
  if (!Array.isArray(roles)) return ["ORGANIZER_PARTNER"];
  const next = roles.filter((role) => PARTNER_ROLES.includes(role));
  return next.length ? next : ["ORGANIZER_PARTNER"];
}

export async function GET() {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const organizers = await ExternalOrganizer.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: organizers }, { status: 200 });
  } catch (error) {
    console.error("Fetch organizers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load partners" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body.organizationName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Organization name is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const organizer = await ExternalOrganizer.create({
      organizationName: body.organizationName,
      slug: body.slug ? slugify(body.slug) : await buildUniqueSlug(body.organizationName),
      organizationType: body.organizationType || "COMPANY",
      partnerRoles: sanitizeRoles(body.partnerRoles),
      description: body.description || "",
      logoUrl: body.logoUrl || "",
      website: body.website || "",
      location: body.location || "",
      contactName: body.contactName || "",
      contactEmail: body.contactEmail || "",
      contactPhone: body.contactPhone || "",
      verificationStatus: body.verificationStatus || "VERIFIED",
      profileVisibility: body.profileVisibility || "PRIVATE",
      trustLevel: body.trustLevel || "APPROVED_PARTNER",
      adminNotes: body.adminNotes || "",
    });

    return NextResponse.json({ success: true, data: organizer }, { status: 201 });
  } catch (error) {
    console.error("Create organizer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create partner" },
      { status: 500 }
    );
  }
}
