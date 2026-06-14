import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ExternalOrganizer from "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get("email"));
    const phone = normalizePhone(searchParams.get("phone"));

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: "Email or phone is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const candidates = await ExternalOrganizer.find(
      email ? { $or: [{ contactEmail: email }, { contactPhone: { $ne: "" } }] } : { contactPhone: { $ne: "" } }
    )
      .select(
        "organizationName organizationType website logoUrl location contactName contactEmail contactPhone verificationStatus profileVisibility slug partnerRoles"
      )
      .limit(100)
      .lean();

    const partner = candidates.find((candidate) => {
      const emailMatches =
        email && normalizeEmail(candidate.contactEmail) === email;
      const phoneMatches =
        phone && normalizePhone(candidate.contactPhone) === phone;
      return emailMatches || phoneMatches;
    });

    if (!partner) {
      return NextResponse.json({ success: true, partner: null });
    }

    return NextResponse.json({
      success: true,
      partner: {
        id: String(partner._id),
        organizationName: partner.organizationName || "",
        organizationType: partner.organizationType || "ACADEMY",
        website: partner.website || "",
        logoUrl: partner.logoUrl || "",
        location: partner.location || "",
        contactName: partner.contactName || "",
        contactEmail: partner.contactEmail || "",
        contactPhone: partner.contactPhone || "",
        verificationStatus: partner.verificationStatus || "PENDING",
        profileVisibility: partner.profileVisibility || "PRIVATE",
        slug: partner.slug || "",
        partnerRoles: partner.partnerRoles || [],
      },
    });
  } catch (error) {
    console.error("GET /api/event-proposals/partner-lookup error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to search partner records" },
      { status: 500 }
    );
  }
}
