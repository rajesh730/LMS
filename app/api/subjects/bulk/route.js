import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import { NextResponse } from "next/server";

/**
 * GET /api/subjects/export
 * Export subjects as CSV
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDB();

    let query = { status: "ACTIVE" };

    if (session.user.role === "SCHOOL_ADMIN") {
      query = {
        ...query,
        $or: [
          { subjectType: "GLOBAL" },
          { school: session.user.id },
        ],
      };
    }

    const subjects = await Subject.find(query).sort({ name: 1 });

    // Format as CSV
    const headers = ["Name", "Code", "Type", "Academic Type", "Education Levels", "Description"];
    const rows = subjects.map(s => [
      s.name,
      s.code,
      s.subjectType,
      s.academicType,
      (s.educationLevel || []).join(";"),
      s.description || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="subjects.csv"',
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export subjects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subjects/bulk-import
 * Import subjects from CSV
 * 
 * Expected CSV format:
 * Subject Name,Subject Code,Type,Subject Category
 * Mathematics,MATH,GLOBAL,CORE
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.trim().split("\n");

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have headers and at least one row" },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const codeIdx = headers.indexOf("code");
    const typeIdx = headers.indexOf("type");
    const academicIdx = headers.indexOf("academic type");
    const descIdx = headers.indexOf("description");
    const educationIdx = headers.indexOf("education levels");

    if (nameIdx === -1 || codeIdx === -1 || typeIdx === -1 || academicIdx === -1) {
      return NextResponse.json(
        { error: "CSV must have Name, Code, Type, and Academic Type columns" },
        { status: 400 }
      );
    }

    await connectDB();

    const createdSubjects = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map(cell => cell.trim().replace(/^"|"$/g, ""));

      if (row.length < 4 || !row[nameIdx] || !row[codeIdx]) continue;

      try {
        const name = row[nameIdx];
        const code = row[codeIdx].toUpperCase();
        const type = row[typeIdx].toUpperCase();
        const academic = row[academicIdx].toUpperCase();
        const description = descIdx !== -1 ? row[descIdx] : "";
        const educationLevel = educationIdx !== -1 && row[educationIdx]
          ? row[educationIdx].split(";").map(e => e.trim()).filter(e => ['School'].includes(e))
          : [];

        // Validate type
        if (!["GLOBAL", "SCHOOL_CUSTOM"].includes(type)) {
          errors.push(`Row ${i + 1}: Invalid type "${type}". Must be GLOBAL or SCHOOL_CUSTOM`);
          continue;
        }

        // Only SUPER_ADMIN can create global subjects
        if (type === "GLOBAL" && session.user.role !== "SUPER_ADMIN") {
          errors.push(`Row ${i + 1}: Only SUPER_ADMIN can create GLOBAL subjects`);
          continue;
        }

        // Validate academic type
        if (!["CORE", "ELECTIVE", "EXTRA_CURRICULAR"].includes(academic)) {
          errors.push(`Row ${i + 1}: Invalid academic type "${academic}"`);
          continue;
        }

        // Check for duplicates
        const school = type === "GLOBAL" ? null : session.user.id;
        const exists = await Subject.findOne({ code, school });

        if (exists) {
          errors.push(`Row ${i + 1}: Subject with code "${code}" already exists`);
          continue;
        }

        // Create subject
        const subject = new Subject({
          name,
          code,
          description,
          subjectType: type,
          school,
          academicType: academic,
          status: "ACTIVE",
          createdBy: session.user.id,
        });

        await subject.save();
        createdSubjects.push({ name, code });
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        created: createdSubjects.length,
        createdSubjects,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import subjects" },
      { status: 500 }
    );
  }
}
