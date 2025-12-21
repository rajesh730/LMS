import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("Education Config: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Education Config: Fetching for", session.user.email);

    let userIdToFetch = session.user.id;
    
    // If user is a Teacher, fetch the School's config, not the Teacher's
    if (session.user.role === 'TEACHER') {
        if (!session.user.schoolId) {
             return NextResponse.json({ error: "Teacher has no school assigned" }, { status: 400 });
        }
        userIdToFetch = session.user.schoolId;
    }

    // Get the school user data with education configuration
    // Use findById for better reliability than email+role
    const schoolUser = await User.findById(userIdToFetch).select("educationLevels schoolConfig schoolName role");

    if (!schoolUser) {
      console.log("Education Config: School User not found by ID", userIdToFetch);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    // Optional: Check if role is appropriate if needed, but for config fetching, 
    // if they are logged in and accessing this, we can probably return what we have.
    // Or ensure they are SCHOOL_ADMIN.
    if (schoolUser.role !== "SCHOOL_ADMIN") {
         console.log("Education Config: User is not SCHOOL_ADMIN", schoolUser.role);
         // If we want to be strict:
         // return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
    }

    return NextResponse.json({
      educationLevels: schoolUser.educationLevels || {},
      schoolConfig: schoolUser.schoolConfig || {},
      schoolName: schoolUser.schoolName,
    });
  } catch (error) {
    console.error("Error fetching education config:", error);
    return NextResponse.json(
      { error: "Failed to fetch education configuration" },
      { status: 500 }
    );
  }
}
