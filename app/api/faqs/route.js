import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import FAQ from "@/models/FAQ";
import connectDB from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = { published: true };

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const faqs = await FAQ.find(query)
      .populate("createdBy", "name email")
      .populate("relatedTicket", "title status")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(200, "FAQs fetched successfully", { faqs });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return errorResponse(500, "Internal server error: " + error.message);
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return errorResponse(403, "Only super admin can create FAQs");
    }

    const body = await req.json();
    const { title, content, category, relatedTicket } = body;

    if (!title || !content) {
      return errorResponse(400, "Title and content are required");
    }

    const faq = new FAQ({
      title: title.trim(),
      content: content.trim(),
      category: category || "General",
      relatedTicket: relatedTicket || null,
      createdBy: session.user.id,
      published: true,
    });

    await faq.save();
    await faq.populate("createdBy", "name email");

    return successResponse(201, "FAQ created successfully", { faq });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return errorResponse(500, "Internal server error: " + error.message);
  }
}
