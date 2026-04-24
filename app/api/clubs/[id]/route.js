import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Club from "@/models/Club";

export const dynamic = "force-dynamic";

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    await connectDB();

    const club = await Club.findOne({ _id: params.id, school: session.user.id });
    if (!club) {
      return NextResponse.json({ success: false, message: "Club not found" }, { status: 404 });
    }

    const body = await req.json();
    club.name = body.name || club.name;
    club.slug = body.slug || club.slug;
    club.description = body.description || "";
    club.clubType = body.clubType || club.clubType;
    club.coordinators = Array.isArray(body.coordinators) ? body.coordinators : [];
    club.members = Array.isArray(body.members) ? body.members : [];
    club.visibility = body.visibility || club.visibility;
    club.isPubliclyListed = Boolean(body.isPubliclyListed);
    club.status = body.status || club.status;
    club.foundedAt = body.foundedAt || null;

    await club.save();

    return NextResponse.json({ success: true, data: club }, { status: 200 });
  } catch (error) {
    console.error("Clubs PUT error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update club" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    await connectDB();

    const club = await Club.findOne({ _id: params.id, school: session.user.id });
    if (!club) {
      return NextResponse.json({ success: false, message: "Club not found" }, { status: 404 });
    }

    await Club.deleteOne({ _id: club._id });

    return NextResponse.json({ success: true, message: "Club deleted" }, { status: 200 });
  } catch (error) {
    console.error("Clubs DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete club" },
      { status: 500 }
    );
  }
}
