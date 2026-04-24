import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Club from "@/models/Club";

export const dynamic = "force-dynamic";

function resolveSchoolId(session) {
  if (session.user.role === "SCHOOL_ADMIN") return session.user.id;
  if (session.user.role === "TEACHER") return session.user.schoolId;
  return null;
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const publicSchoolId = searchParams.get("school");

    await connectDB();

    if (!session) {
      if (!publicSchoolId) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }

      const clubs = await Club.find({
        school: publicSchoolId,
        status: "ACTIVE",
        isPubliclyListed: true,
      })
        .sort({ createdAt: -1 })
        .populate("coordinators", "name email")
        .lean();

      return NextResponse.json({ success: true, data: clubs }, { status: 200 });
    }

    if (!["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const schoolId = resolveSchoolId(session);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const clubs = await Club.find({ school: schoolId })
      .sort({ createdAt: -1 })
      .populate("coordinators", "name email")
      .populate("members", "name grade")
      .lean();

    return NextResponse.json({ success: true, data: clubs }, { status: 200 });
  } catch (error) {
    console.error("Clubs GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch clubs" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { success: false, message: "Name and slug are required" },
        { status: 400 }
      );
    }

    const club = await Club.create({
      school: session.user.id,
      name: body.name,
      slug: body.slug,
      description: body.description || "",
      clubType: body.clubType || "GENERAL",
      coordinators: Array.isArray(body.coordinators) ? body.coordinators : [],
      members: Array.isArray(body.members) ? body.members : [],
      visibility: body.visibility || "SCHOOL_ONLY",
      isPubliclyListed: Boolean(body.isPubliclyListed),
      foundedAt: body.foundedAt || null,
    });

    return NextResponse.json({ success: true, data: club }, { status: 201 });
  } catch (error) {
    console.error("Clubs POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create club" },
      { status: 500 }
    );
  }
}
