import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import GradeSubject from "@/models/GradeSubject";
import { getServerSession } from "next-auth";

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession();

    if (!session?.user?.schoolId) {
      return Response.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, code, description, grade } = await req.json();

    if (!name || !code || !grade) {
      return Response.json(
        { message: "Name, code, and grade are required" },
        { status: 400 }
      );
    }

    // Search for existing GLOBAL subject with same name (case-insensitive)
    let subject = await Subject.findOne({
      name: new RegExp(`^${name}$`, "i"),
      subjectType: "GLOBAL"
    });

    const isNew = !subject;

    // If not found, create a SCHOOL_CUSTOM subject
    if (!subject) {
      subject = await Subject.create({
        name,
        code,
        description,
        subjectType: "SCHOOL_CUSTOM",
        educationLevel: ["School"],
        school: session.user.schoolId,
        createdBy: session.user.id
      });
    }

    // Create mapping in GradeSubject
    const mapping = await GradeSubject.findOneAndUpdate(
      {
        school: session.user.schoolId,
        grade,
        subject: subject._id
      },
      {
        status: "ACTIVE",
        addedBy: session.user.id
      },
      { upsert: true, new: true }
    );

    return Response.json(
      {
        data: {
          subject,
          mapping,
          isNew,
          message: isNew ? "Subject created" : "Subject linked"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating subject for grade:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
