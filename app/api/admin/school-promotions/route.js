import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolPromotion from "@/models/SchoolPromotion";
import User from "@/models/User";
import {
  PROMOTION_PLACEMENTS,
  PROMOTION_PRIORITIES,
  PROMOTION_STATUSES,
} from "@/lib/schoolPromotions";

function getDefaultStartDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDefaultEndDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 10);
  date.setHours(23, 59, 59, 999);
  return date;
}

function serializePromotion(promotion) {
  return {
    id: String(promotion._id),
    school: promotion.school
      ? {
          id: String(promotion.school._id),
          name: promotion.school.schoolName || promotion.school.email,
          location: promotion.school.schoolLocation || "",
          email: promotion.school.email || "",
        }
      : null,
    title: promotion.title || "",
    tagline: promotion.tagline || "",
    placement: promotion.placement,
    status: promotion.status,
    priority: promotion.priority,
    paymentStatus: promotion.paymentStatus || "PENDING",
    paidAmount: promotion.paidAmount || 0,
    paymentReference: promotion.paymentReference || "",
    paidAt: promotion.paidAt,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    destinationUrl: promotion.destinationUrl || "",
    notes: promotion.notes || "",
    impressionCount: promotion.impressionCount || 0,
    clickCount: promotion.clickCount || 0,
    lastShownAt: promotion.lastShownAt,
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
  };
}

function getDate(value, boundary = "start") {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const suffix =
      boundary === "end" ? "T23:59:59.999" : "T00:00:00.000";
    const dateOnly = new Date(`${value}${suffix}`);
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validatePayload(body) {
  const school = String(body.school || "").trim();
  const placement = String(body.placement || "").toUpperCase();
  const status = String(body.status || "DRAFT").toUpperCase();
  const priority = String(body.priority || "STANDARD").toUpperCase();
  const paymentStatus = "PAID";
  const startsAt = getDefaultStartDate();
  const endsAt = getDefaultEndDate();
  const paidAmount = 0;

  if (!school) return { error: "School is required" };
  if (!PROMOTION_PLACEMENTS.includes(placement)) {
    return { error: "Invalid spotlight placement" };
  }
  if (!PROMOTION_STATUSES.includes(status)) {
    return { error: "Invalid campaign status" };
  }
  if (!PROMOTION_PRIORITIES.includes(priority)) {
    return { error: "Invalid campaign priority" };
  }
  if (endsAt <= startsAt) {
    return { error: "End date must be after the start date" };
  }

  return {
    data: {
      school,
      placement,
      status,
      priority,
      paymentStatus,
      paidAmount,
      paymentReference: "",
      paidAt: paymentStatus === "PAID" ? getDate(body.paidAt) || new Date() : null,
      startsAt,
      endsAt,
      title: "",
      tagline: "",
      destinationUrl: String(body.destinationUrl || "").trim(),
      notes: String(body.notes || "").trim(),
    },
  };
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [promotions, schools] = await Promise.all([
      SchoolPromotion.find({})
        .sort({ status: 1, startsAt: -1, updatedAt: -1 })
        .populate("school", "schoolName schoolLocation email")
        .lean(),
      User.find({
        role: "SCHOOL_ADMIN",
        status: { $in: ["APPROVED", "SUBSCRIBED"] },
      })
        .select("schoolName schoolLocation province district email principalName status")
        .sort({ schoolName: 1 })
        .lean(),
    ]);

    return NextResponse.json({
      promotions: promotions.map(serializePromotion),
      schools: schools.map((school) => ({
        id: String(school._id),
        name: school.schoolName || school.email,
        location: school.schoolLocation || "",
        province: school.province || "",
        district: school.district || "",
        email: school.email || "",
        principalName: school.principalName || "",
        status: school.status || "",
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/school-promotions error:", error);
    return NextResponse.json(
      { message: "Failed to load school spotlight campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const validation = validatePayload(body);

    if (validation.error) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    const school = await User.findOne({
      _id: validation.data.school,
      role: "SCHOOL_ADMIN",
      status: { $in: ["APPROVED", "SUBSCRIBED"] },
    }).select("_id");

    if (!school) {
      return NextResponse.json(
        { message: "Selected school is not active" },
        { status: 400 }
      );
    }

    const promotion = await SchoolPromotion.create({
      ...validation.data,
      createdBy: session.user.id,
    });

    await promotion.populate("school", "schoolName schoolLocation email");

    return NextResponse.json(
      {
        message:
          validation.data.status === "ACTIVE"
            ? "School spotlight campaign activated"
            : "School spotlight campaign saved",
        promotion: serializePromotion(promotion),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/school-promotions error:", error);
    return NextResponse.json(
      { message: "Failed to save school spotlight campaign" },
      { status: 500 }
    );
  }
}
