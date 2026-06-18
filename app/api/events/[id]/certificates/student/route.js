import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { getActiveCertificateFilter } from "@/lib/certificates";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import Student from "@/models/Student";

export const dynamic = "force-dynamic";

function buildStudentLookup(session) {
  return {
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  };
}

function serializeCertificate(certificate) {
  return {
    _id: String(certificate._id),
    title: certificate.title || "",
    description: certificate.description || "",
    placement: certificate.placement || "PARTICIPANT",
    finalStatus: certificate.finalStatus || "",
    recipientType: certificate.recipientType || "STUDENT",
    teamName: certificate.teamName || "",
    certificateRecipientName: certificate.certificateRecipientName || "",
    certificateUrl: certificate.certificateUrl || "",
    certificateCode: certificate.certificateCode || "",
    certificateIssuedAt: certificate.certificateIssuedAt
      ? new Date(certificate.certificateIssuedAt).toISOString()
      : null,
    awardedAt: certificate.awardedAt
      ? new Date(certificate.awardedAt).toISOString()
      : null,
    event: certificate.event
      ? {
          _id: String(certificate.event._id || certificate.event),
          title: certificate.event.title || "",
          resultsPublished: Boolean(certificate.event.resultsPublished),
        }
      : null,
  };
}

export async function GET(_req, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    await connectDB();

    const [student, event] = await Promise.all([
      Student.findOne(buildStudentLookup(session)).select("_id school").lean(),
      Event.findById(params.id)
        .select("title resultsPublished lifecycleStatus")
        .lean(),
    ]);

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!event.resultsPublished) {
      return NextResponse.json({
        certificates: [],
        resultState: "Results are not published yet.",
      });
    }

    const certificates = await Achievement.find({
      event: params.id,
      student: student._id,
      school: student.school,
      ...getActiveCertificateFilter(),
    })
      .populate("event", "title resultsPublished")
      .sort({ awardedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      certificates: certificates.map(serializeCertificate),
      resultState:
        certificates.length > 0
          ? "Certificate available."
          : "Results are published, but no certificate is assigned to this student.",
    });
  } catch (error) {
    console.error("Student event certificates error:", error);
    return NextResponse.json(
      { message: "Failed to load student certificates" },
      { status: 500 }
    );
  }
}
