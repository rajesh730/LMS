import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import { notifySchoolMagazineSubmitted } from "@/lib/magazineNotifications";
import { normalizeWritingCategory } from "@/lib/writingCategories";
import { buildAuthoredEraSnapshot } from "@/lib/studentEnrollment";

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("_id school name grade rollNumber")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    // The writing belongs to the student (her property), so it follows her across
    // schools — match by author only, not current school. Pieces written at a
    // school she has since left are flagged `isTransferredOut` so the UI can label
    // them ("written at X") and offer portfolio editing instead of school review.
    const currentSchoolId = String(student.school || "");
    const writings = await SchoolMagazineArticle.find({
      authorStudent: student._id,
      isDeleted: { $ne: true },
    })
      .populate("school", "schoolName")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      writings: writings.map((article) => ({
          id: String(article._id),
          sourceType: "SCHOOL_MAGAZINE_ARTICLE",
          title: article.title,
          content: article.content,
          category: article.category,
          schoolId: article.school?._id ? String(article.school._id) : "",
          schoolName:
            article.authorSchoolNameSnapshot ||
            article.school?.schoolName ||
            "",
          isTransferredOut:
            String(article.school?._id || article.school || "") !==
            currentSchoolId,
          submissionSource: article.submissionSource || "FREE_WRITE",
          status: article.status,
          reviewNote: article.reviewNote || "",
          isPublished: Boolean(article.isPublished),
          isMagazinePublished: Boolean(article.isMagazinePublished),
          magazineIssue: article.magazineIssue ? String(article.magazineIssue) : "",
          isFeatured: Boolean(article.isFeatured),
          showOnSchoolWall:
            article.status !== "DRAFT" && article.showOnSchoolWall !== false,
          isGlobalWallPublished: Boolean(article.isGlobalWallPublished),
          publicationScope: article.publicationScope || "SCHOOL_ONLY",
          submittedAt: article.submittedAt,
          firstSubmittedAt: article.firstSubmittedAt,
          lastResubmittedAt: article.lastResubmittedAt,
          revisionCount: Number(article.revisionCount || 0),
          reviewedAt: article.reviewedAt,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          createdAt: article.createdAt,
      })),
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade,
        rollNumber: student.rollNumber,
      },
    });
  } catch (error) {
    console.error("GET /api/student/writings error:", error);
    return NextResponse.json(
      { message: "Failed to load student writings" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("_id school grade name enrollments")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const authoredEra = buildAuthoredEraSnapshot(student);

    const body = await request.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const category = normalizeWritingCategory(body.category);
    const resubmissionOf = String(
      body.resubmissionOf || body.articleId || body.id || ""
    ).trim();
    const requestedStatus =
      String(body.status || "").toUpperCase() === "SUBMITTED"
        ? "SUBMITTED"
        : "DRAFT";

    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      );
    }

    if (/^[0-9a-f]{24}$/i.test(resubmissionOf)) {
      const article = await SchoolMagazineArticle.findOne({
        _id: resubmissionOf,
        school: student.school,
        authorStudent: student._id,
        status: "REJECTED",
        isDeleted: { $ne: true },
      });

      if (article) {
        const submittedAt = requestedStatus === "SUBMITTED" ? new Date() : null;
        const previousStatus = article.status;

        // Stamp the authoring-era snapshot once if this doc predates it; never
        // overwrite, so the label reflects when it was first written.
        if (!article.authorSchoolNameSnapshot) {
          article.authorSchoolNameSnapshot = authoredEra.authorSchoolNameSnapshot;
          article.authorGrade = authoredEra.authorGrade;
          article.authorAcademicYear = authoredEra.authorAcademicYear;
          article.authorAcademicYearStart = authoredEra.authorAcademicYearStart;
        }

        article.title = title;
        article.content = content;
        article.category = category;
        article.status = requestedStatus;
        article.showOnSchoolWall = requestedStatus === "SUBMITTED";
        article.isMagazinePublished = false;
        article.isPublished = false;
        article.magazinePublishedAt = null;
        article.publishedAt = null;

        if (requestedStatus === "SUBMITTED") {
          article.reviewNote = "";
          article.firstSubmittedAt =
            article.firstSubmittedAt || article.submittedAt || submittedAt;
          article.submittedAt = submittedAt;
          article.lastResubmittedAt = submittedAt;
          article.revisionCount = Number(article.revisionCount || 0) + 1;
          article.reviewedAt = null;
          article.reviewedBy = null;
        }

        await article.save();

        publishWorkIndicatorsUpdate("student-writing-updated", {
          schoolId: String(student.school),
          studentId: String(student._id),
          status: article.status,
        });

        if (requestedStatus === "SUBMITTED") {
          await notifySchoolMagazineSubmitted({
            article,
            student,
            schoolId: student.school,
            isResubmission: previousStatus === "REJECTED",
          });
        }

        return NextResponse.json({
          message:
            requestedStatus === "SUBMITTED"
              ? "Posted to school wall"
              : "Private writing updated",
          article,
        });
      }
    }

    const submittedAt = requestedStatus === "SUBMITTED" ? new Date() : null;
    const article = await SchoolMagazineArticle.create({
      school: student.school,
      authorStudent: student._id,
      ...authoredEra,
      title,
      content,
      category,
      submissionSource: "FREE_WRITE",
      status: requestedStatus,
      showOnSchoolWall: requestedStatus === "SUBMITTED",
      isMagazinePublished: false,
      isPublished: false,
      submittedAt,
      firstSubmittedAt: submittedAt,
    });

    publishWorkIndicatorsUpdate("student-writing-created", {
      schoolId: String(student.school),
      studentId: String(student._id),
      status: article.status,
    });

    if (requestedStatus === "SUBMITTED") {
      await notifySchoolMagazineSubmitted({
        article,
        student,
        schoolId: student.school,
      });
    }

    return NextResponse.json(
      {
        message:
          requestedStatus === "SUBMITTED"
            ? "Posted to school wall"
            : "Private writing saved",
        article,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/student/writings error:", error);
    return NextResponse.json(
      { message: "Failed to save writing" },
      { status: 500 }
    );
  }
}
