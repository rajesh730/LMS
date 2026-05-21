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

const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED"];

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
  const paymentStatus = String(body.paymentStatus || "PENDING").toUpperCase();
  const startsAt = getDate(body.startsAt, "start");
  const endsAt = getDate(body.endsAt, "end");
  const paidAmount = Math.max(0, Number(body.paidAmount || 0));

  if (!school) return { error: "School is required" };
  if (!PROMOTION_PLACEMENTS.includes(placement)) {
    return { error: "Invalid spotlight placement" };
  }
  if (!PROMOTION_STATUSES.includes(status) || status === "ARCHIVED") {
    return { error: "Invalid campaign status" };
  }
  if (!PROMOTION_PRIORITIES.includes(priority)) {
    return { error: "Invalid campaign priority" };
  }
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    return { error: "Invalid payment status" };
  }
  if (status === "ACTIVE" && paymentStatus !== "PAID") {
    return {
      error: "Only paid campaigns can be activated for public spotlight",
    };
  }
  if (!startsAt || !endsAt) {
    return { error: "Start and end dates are required" };
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
      paymentReference: String(body.paymentReference || "").trim(),
      paidAt: paymentStatus === "PAID" ? getDate(body.paidAt) || new Date() : null,
      startsAt,
      endsAt,
      title: String(body.title || "").trim(),
      tagline: String(body.tagline || "").trim(),
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

export async function PATCH(request, props) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const promotion = await SchoolPromotion.findById(params.id);

    if (!promotion) {
      return NextResponse.json(
        { message: "School spotlight campaign not found" },
        { status: 404 }
      );
    }

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

    Object.assign(promotion, validation.data);
    if (promotion.status !== "ARCHIVED") promotion.archivedAt = null;

    await promotion.save();
    await promotion.populate("school", "schoolName schoolLocation email");

    return NextResponse.json({
      message: "School spotlight campaign updated",
      promotion: serializePromotion(promotion),
    });
  } catch (error) {
    console.error("PATCH /api/admin/school-promotions/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update school spotlight campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, props) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const params = await props.params;
    const promotion = await SchoolPromotion.findById(params.id);

    if (!promotion) {
      return NextResponse.json(
        { message: "School spotlight campaign not found" },
        { status: 404 }
      );
    }

    promotion.status = "ARCHIVED";
    promotion.archivedAt = new Date();
    await promotion.save();

    return NextResponse.json({
      message: "School spotlight campaign archived",
    });
  } catch (error) {
    console.error("DELETE /api/admin/school-promotions/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to archive school spotlight campaign" },
      { status: 500 }
    );
  }
}
