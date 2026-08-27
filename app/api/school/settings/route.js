import { requireApiSession } from "@/lib/authz";
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
  validationError,
} from "@/lib/apiResponse";

function cleanText(value) {
  return String(value ?? "").trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWebsite(value) {
  if (!value) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;
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
      Teacher.countDocuments({
        school: session.user.id,
        isDeleted: { $ne: true },
      }),
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
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;
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

    if (!existingUser) {
      return errorResponse(404, "School account not found");
    }

    const userUpdate = {};
    if (identity.schoolName !== undefined) {
      userUpdate.schoolName = cleanText(identity.schoolName);
      if (!userUpdate.schoolName) {
        return validationError("School name is required.");
      }
    }
    if (identity.principalName !== undefined) {
      userUpdate.principalName = cleanText(identity.principalName);
    }
    if (identity.principalPhone !== undefined) {
      userUpdate.principalPhone = cleanText(identity.principalPhone);
    }
    if (identity.email !== undefined) {
      const email = cleanText(identity.email).toLowerCase();
      if (!email || !isValidEmail(email)) {
        return validationError("A valid official email is required.");
      }

      const emailOwner = await User.findOne({
        email,
        _id: { $ne: session.user.id },
      }).select("_id");
      if (emailOwner) {
        return validationError("That email address is already in use.");
      }
      userUpdate.email = email;
    }
    if (identity.phone !== undefined) userUpdate.schoolPhone = cleanText(identity.phone);
    if (identity.address !== undefined) {
      userUpdate.schoolLocation = cleanText(identity.address);
    }
    if (identity.website !== undefined) {
      userUpdate.website = cleanText(identity.website);
      if (!isValidWebsite(userUpdate.website)) {
        return validationError("Website must start with http:// or https://.");
      }
    }
    if (identity.establishedYear !== undefined) {
      const year = cleanText(identity.establishedYear);
      const numericYear = Number(year);
      if (
        year &&
        (!Number.isInteger(numericYear) ||
          numericYear < 1800 ||
          numericYear > new Date().getFullYear())
      ) {
        return validationError("Established year must be a valid year.");
      }
      userUpdate.establishedYear = year ? numericYear : null;
    }

    const updatedUser =
      Object.keys(userUpdate).length > 0
        ? await User.findByIdAndUpdate(session.user.id, userUpdate, {
            new: true,
            runValidators: true,
          })
        : existingUser;

    const configUpdate = {};
    if (configBody.schoolCode !== undefined) {
      configUpdate.schoolCode = cleanText(configBody.schoolCode);
    }
    if (configBody.city !== undefined) configUpdate.city = cleanText(configBody.city);
    if (configBody.state !== undefined) configUpdate.state = cleanText(configBody.state);
    if (configBody.pincode !== undefined) configUpdate.pincode = cleanText(configBody.pincode);
    if (configBody.teacherRoles !== undefined) {
      configUpdate.teacherRoles = normalizeTeacherRoles(configBody.teacherRoles);
      configUpdate.teacherRolesCustomized = true;
    }

    const config =
      Object.keys(configUpdate).length > 0
        ? await SchoolConfig.findOneAndUpdate(
            { school: session.user.id },
            configUpdate,
            { new: true, upsert: true, runValidators: true }
          )
        : existingConfig;

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
      identity: {
        schoolName: updatedUser.schoolName || "",
        principalName: updatedUser.principalName || "",
        principalPhone: updatedUser.principalPhone || "",
        email: updatedUser.email || "",
        phone: updatedUser.schoolPhone || "",
        address: updatedUser.schoolLocation || "",
        website: updatedUser.website || "",
        establishedYear: updatedUser.establishedYear || "",
      },
      config: {
        schoolCode: config?.schoolCode || "",
        city: config?.city || "",
        state: config?.state || "",
        pincode: config?.pincode || "",
        teacherRoles: config?.teacherRoles || [],
        grades: config?.grades || [],
      },
    });
  } catch (error) {
    console.error("School settings PUT error:", error);
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return validationError("That email address is already in use.");
    }
    return errorResponse(500, "Failed to save school settings");
  }
}
