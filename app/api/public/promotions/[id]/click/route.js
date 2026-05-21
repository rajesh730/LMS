import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SchoolPromotion from "@/models/SchoolPromotion";

function getRedirectTarget(request, promotion) {
  const fallback = `/schools/${promotion.school}`;
  const rawTarget = promotion.destinationUrl || fallback;

  try {
    return new URL(rawTarget, request.url);
  } catch {
    return new URL(fallback, request.url);
  }
}

export async function GET(request, props) {
  try {
    await connectDB();

    const params = await props.params;
    const promotion = await SchoolPromotion.findByIdAndUpdate(
      params.id,
      { $inc: { clickCount: 1 } },
      { new: true }
    ).select("school destinationUrl");

    if (!promotion) {
      return NextResponse.redirect(new URL("/schools", request.url));
    }

    return NextResponse.redirect(getRedirectTarget(request, promotion));
  } catch (error) {
    console.error("GET /api/public/promotions/[id]/click error:", error);
    return NextResponse.redirect(new URL("/schools", request.url));
  }
}
