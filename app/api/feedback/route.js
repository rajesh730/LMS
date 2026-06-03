import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Feedback from "@/models/Feedback";
import Student from "@/models/Student";
import User from "@/models/User";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

function clean(value) {
  return String(value || "").trim();
}

function serializeFeedback(feedback) {
  return {
    id: String(feedback._id),
    submitterRole: feedback.submitterRole,
    submitterName: feedback.submitterName,
    submitterEmail: feedback.submitterEmail,
    schoolName: feedback.schoolName,
    type: feedback.type,
    rating: feedback.rating,
    title: feedback.title,
    message: feedback.message,
    status: feedback.status,
    createdAt: feedback.createdAt,
    reviewedAt: feedback.reviewedAt,
  };
}

async function getStudentProfile(session) {
  return Student.findOne({
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  })
    .populate("school", "schoolName email")
    .lean();
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = clean(searchParams.get("status")).toUpperCase();
    const role = clean(searchParams.get("role")).toUpperCase();
    const query = {};

    if (session.user.role === "SUPER_ADMIN") {
      if (["NEW", "REVIEWED", "ARCHIVED"].includes(status)) query.status = status;
      if (["SCHOOL_ADMIN", "STUDENT"].includes(role)) query.submitterRole = role;
    } else if (session.user.role === "SCHOOL_ADMIN") {
      query.submittedBy = session.user.id;
      query.submitterModel = "User";
    } else if (session.user.role === "STUDENT") {
      const student = await getStudentProfile(session);
      if (!student) {
        return NextResponse.json({ feedback: [] });
      }
      query.submittedBy = student._id;
      query.submitterModel = "Student";
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ feedback: feedback.map(serializeFeedback) });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { message: "Failed to load feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SCHOOL_ADMIN", "STUDENT"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const title = clean(body.title);
    const message = clean(body.message);
    const type = clean(body.type).toUpperCase() || "GENERAL";
    const rating = Number(body.rating) || null;

    if (!title || !message) {
      return NextResponse.json(
        { message: "Title and feedback message are required." },
        { status: 400 }
      );
    }

    if (!["GENERAL", "BUG", "SUGGESTION", "EXPERIENCE"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid feedback type." },
        { status: 400 }
      );
    }

    if (rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { message: "Rating must be between 1 and 5." },
        { status: 400 }
      );
    }

    let payload;
    if (session.user.role === "STUDENT") {
      const student = await getStudentProfile(session);
      if (!student) {
        return NextResponse.json(
          { message: "Student profile not found." },
          { status: 404 }
        );
      }
      payload = {
        submittedBy: student._id,
        submitterModel: "Student",
        submitterRole: "STUDENT",
        submitterName: student.name || session.user.name || "",
        submitterEmail: student.email || session.user.email || "",
        school: student.school?._id || student.school || null,
        schoolName: student.school?.schoolName || "",
      };
    } else {
      const school = await User.findById(session.user.id)
        .select("schoolName email")
        .lean();
      payload = {
        submittedBy: session.user.id,
        submitterModel: "User",
        submitterRole: "SCHOOL_ADMIN",
        submitterName: school?.schoolName || session.user.name || "",
        submitterEmail: school?.email || session.user.email || "",
        school: session.user.id,
        schoolName: school?.schoolName || session.user.name || "",
      };
    }

    const feedback = await Feedback.create({
      ...payload,
      type,
      rating,
      title,
      message,
    });

    publishWorkIndicatorsUpdate("feedback-created", {
      feedbackId: String(feedback._id),
      submitterRole: feedback.submitterRole,
    });

    return NextResponse.json(
      {
        message: "Feedback submitted. Thank you for helping improve Pratyo.",
        feedback: serializeFeedback(feedback),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { message: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
