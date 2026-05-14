import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolConfig from "@/models/SchoolConfig";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import { buildGradeLabels } from "@/lib/schoolGrades";
import { normalizeTeacherRoles } from "@/lib/teacherRoleDefaults";
import { recordSettingsAudit } from "@/lib/settingsAudit";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      "schoolName principalName principalPhone email schoolPhone schoolLocation website establishedYear schoolConfig"
    );

    if (!user) {
      return errorResponse(404, "School account not found");
    }

    const derivedGrades = buildGradeLabels(user.schoolConfig);
    let config = await SchoolConfig.findOne({ school: session.user.id }).lean();

    if (!config) {
      config = {
        teacherRoles: [],
        grades: derivedGrades,
        schoolCode: "",
        city: "",
        state: "",
        pincode: "",
      };
    }

    const [totalStudents, totalTeachers] = await Promise.all([
      Student.countDocuments({
        school: session.user.id,
        isDeleted: { $ne: true },
      }),
      Teacher.countDocuments({ school: session.user.id }),
    ]);

    const payload = {
      identity: {
        schoolName: user.schoolName || "",
        principalName: user.principalName || "",
        principalPhone: user.principalPhone || "",
        email: user.email || "",
        phone: user.schoolPhone || "",
        address: user.schoolLocation || "",
        website: user.website || "",
        establishedYear: user.establishedYear || "",
      },
      config: {
        schoolCode: config.schoolCode || "",
        city: config.city || "",
        state: config.state || "",
        pincode: config.pincode || "",
        teacherRoles: normalizeTeacherRoles(config.teacherRoles || []),
        grades: (config.grades || []).length > 0 ? config.grades : derivedGrades,
      },
      stats: {
        totalStudents,
        totalTeachers,
        totalGrades:
          ((config.grades || []).length > 0 ? config.grades : derivedGrades)
            .length || 0,
      },
    };

    return successResponse(200, "School settings retrieved", payload);
  } catch (error) {
    console.error("School settings GET error:", error);
    return errorResponse(500, "Failed to load school settings");
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    const body = await req.json();
    const identity = body.identity || {};
    const configBody = body.config || {};

    await connectDB();

    const [existingUser, existingConfig] = await Promise.all([
      User.findById(session.user.id).select(
        "schoolName principalName principalPhone email schoolPhone schoolLocation website establishedYear"
      ),
      SchoolConfig.findOne({ school: session.user.id }),
    ]);

    const userUpdate = {};
    if (identity.schoolName !== undefined) userUpdate.schoolName = identity.schoolName;
    if (identity.principalName !== undefined) {
      userUpdate.principalName = identity.principalName;
    }
    if (identity.principalPhone !== undefined) {
      userUpdate.principalPhone = identity.principalPhone;
    }
    if (identity.email !== undefined) userUpdate.email = identity.email;
    if (identity.phone !== undefined) userUpdate.schoolPhone = identity.phone;
    if (identity.address !== undefined) {
      userUpdate.schoolLocation = identity.address;
    }
    if (identity.website !== undefined) userUpdate.website = identity.website;
    if (identity.establishedYear !== undefined && identity.establishedYear !== "") {
      userUpdate.establishedYear = Number(identity.establishedYear) || undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(session.user.id, userUpdate, {
      new: true,
    });

    const configUpdate = {};
    if (configBody.schoolCode !== undefined) {
      configUpdate.schoolCode = configBody.schoolCode;
    }
    if (configBody.city !== undefined) configUpdate.city = configBody.city;
    if (configBody.state !== undefined) configUpdate.state = configBody.state;
    if (configBody.pincode !== undefined) configUpdate.pincode = configBody.pincode;
    if (configBody.teacherRoles !== undefined) {
      configUpdate.teacherRoles = normalizeTeacherRoles(configBody.teacherRoles);
      configUpdate.teacherRolesCustomized = true;
    }

    const config = await SchoolConfig.findOneAndUpdate(
      { school: session.user.id },
      configUpdate,
      { new: true, upsert: true }
    );

    await recordSettingsAudit({
      entityType: "SCHOOL_SETTINGS",
      entityId: session.user.id,
      action: "UPDATE",
      performedBy: session.user.id,
      role: session.user.role,
      before: {
        identity: {
          schoolName: existingUser?.schoolName || "",
          principalName: existingUser?.principalName || "",
          principalPhone: existingUser?.principalPhone || "",
          email: existingUser?.email || "",
          phone: existingUser?.schoolPhone || "",
          address: existingUser?.schoolLocation || "",
          website: existingUser?.website || "",
          establishedYear: existingUser?.establishedYear || "",
        },
        config: {
          schoolCode: existingConfig?.schoolCode || "",
          city: existingConfig?.city || "",
          state: existingConfig?.state || "",
          pincode: existingConfig?.pincode || "",
          teacherRoles: existingConfig?.teacherRoles || [],
        },
      },
      after: {
        identity: {
          schoolName: updatedUser?.schoolName || "",
          principalName: updatedUser?.principalName || "",
          principalPhone: updatedUser?.principalPhone || "",
          email: updatedUser?.email || "",
          phone: updatedUser?.schoolPhone || "",
          address: updatedUser?.schoolLocation || "",
          website: updatedUser?.website || "",
          establishedYear: updatedUser?.establishedYear || "",
        },
        config: {
          schoolCode: config?.schoolCode || "",
          city: config?.city || "",
          state: config?.state || "",
          pincode: config?.pincode || "",
          teacherRoles: config?.teacherRoles || [],
        },
      },
    });

    return successResponse(200, "School settings updated", {
      identity,
      config,
    });
  } catch (error) {
    console.error("School settings PUT error:", error);
    return errorResponse(500, "Failed to save school settings");
  }
}
