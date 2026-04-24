import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const schools = await User.find({
      role: "SCHOOL_ADMIN",
      status: { $in: ["APPROVED", "SUBSCRIBED"] },
    })
      .select("schoolName schoolLocation website establishedYear")
      .sort({ createdAt: -1 })
      .lean();

    const schoolIds = schools.map((school) => school._id);
    const profiles = await SchoolShowcaseProfile.find({
      school: { $in: schoolIds },
      visibility: "PUBLIC",
    })
      .select("school tagline highlightMetrics")
      .lean();

    const profileMap = new Map(profiles.map((profile) => [profile.school.toString(), profile]));

    const data = schools.map((school) => ({
      ...school,
      showcase: profileMap.get(school._id.toString()) || null,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Public Schools GET Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}
