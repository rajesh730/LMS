import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();

    const result = await SchoolConfig.updateMany(
      {},
      {
        $unset: {
          schoolName: "",
          email: "",
          phone: "",
          address: "",
          principalName: "",
          principalPhone: "",
          website: "",
        },
      }
    );

    return successResponse(200, "Legacy school config fields removed", {
      matchedCount: result.matchedCount ?? result.n,
      modifiedCount: result.modifiedCount ?? result.nModified,
    });
  } catch (error) {
    console.error("School config cleanup migration error:", error);
    return errorResponse(500, "Failed to clean legacy school config fields");
  }
}
