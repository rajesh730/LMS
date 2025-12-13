import dbConnect from "@/lib/db";
import Notice from "@/models/Notice";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const active = searchParams.get("active") !== "false";
    const audience = searchParams.get("audience"); // 'students', 'teachers', 'parents'
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    const query = {
      school: session.user.id,
      isActive: active,
    };

    // Add filters
    if (type) query.type = type.toUpperCase();
    if (priority) query.priority = priority.toUpperCase();

    // Filter by audience
    if (audience) {
      query[`targetAudience.${audience}`] = true;
    }

    // Only show non-expired notices by default
    if (active) {
      query.$or = [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }];
    }

    const skip = (page - 1) * limit;

    const notices = await Notice.find(query)
      .populate("author", "name email")
      .sort({ priority: -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notice.countDocuments(query);

    return Response.json({
      notices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/notices error:", error);
    return Response.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      type,
      priority,
      targetAudience,
      grades,
      expiryDate,
    } = body;

    if (!title || !content) {
      return Response.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Validate target audience
    if (
      !targetAudience?.students &&
      !targetAudience?.teachers &&
      !targetAudience?.parents
    ) {
      return Response.json(
        { error: "At least one target audience must be selected" },
        { status: 400 }
      );
    }

    const newNotice = new Notice({
      title: title.trim(),
      content: content.trim(),
      type: type?.toUpperCase() || "GENERAL",
      priority: priority?.toUpperCase() || "NORMAL",
      school: session.user.id,
      author: session.user.id,
      targetAudience,
      grades: grades || [],
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      attachments: [],
      publishedAt: new Date(),
    });

    const savedNotice = await newNotice.save();

    // Populate author for response
    await savedNotice.populate("author", "name email");

    return Response.json(
      {
        message: "Notice published successfully",
        notice: savedNotice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notices error:", error);
    return Response.json({ error: "Failed to create notice" }, { status: 500 });
  }
}
