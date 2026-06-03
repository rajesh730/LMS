import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformSetting from "@/models/PlatformSetting";
import { recordSettingsAudit } from "@/lib/settingsAudit";
import {
  errorResponse,
  successResponse,
  unauthorizedError,
} from "@/lib/apiResponse";

const LEGACY_PLATFORM_ROLE_BASELINE = [
  "Activity Coordinator",
  "Mentor",
  "Program Lead",
  "Showcase Coach",
  "Events Lead",
];

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeDefaults(defaults = {}) {
  const normalized = { ...defaults };
  if (
    typeof normalized.allowFeedbackForm !== "boolean" &&
    typeof normalized.allowSupportTickets === "boolean"
  ) {
    normalized.allowFeedbackForm = normalized.allowSupportTickets;
  }
  delete normalized.allowSupportTickets;
  return normalized;
}

async function getOrCreateSettings() {
  let settings = await PlatformSetting.findOne({ singletonKey: "platform" });
  if (!settings) {
    settings = await PlatformSetting.create({ singletonKey: "platform" });
  } else {
    const currentRoles = normalizeStringList(
      settings.defaults?.defaultTeacherRoles || []
    );
    if (
      JSON.stringify(currentRoles) ===
      JSON.stringify(LEGACY_PLATFORM_ROLE_BASELINE)
    ) {
      settings.defaults = {
        ...settings.defaults?.toObject?.(),
        defaultTeacherRoles: [],
      };
      await settings.save();
    }
  }
  return settings;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();
    const settings = await getOrCreateSettings();

    return successResponse(200, "Platform settings retrieved", settings);
  } catch (error) {
    console.error("Platform settings GET error:", error);
    return errorResponse(500, "Failed to load platform settings");
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return unauthorizedError();
    }

    const body = await req.json();
    await connectDB();

    const settings = await getOrCreateSettings();
    const before = settings.toObject();

    const hasTeacherRolesField = Array.isArray(body?.defaults?.defaultTeacherRoles);
    const teacherRoles = hasTeacherRolesField
      ? normalizeStringList(body.defaults.defaultTeacherRoles)
      : [];

    settings.general = {
      ...settings.general?.toObject?.(),
      ...body.general,
    };
    settings.governance = {
      ...settings.governance?.toObject?.(),
      ...body.governance,
    };
    settings.defaults = {
      ...settings.defaults?.toObject?.(),
      ...normalizeDefaults(body.defaults),
      ...(hasTeacherRolesField
        ? { defaultTeacherRoles: teacherRoles }
        : {}),
    };
    settings.updatedBy = session.user.id;

    await settings.save();

    await recordSettingsAudit({
      entityType: "PLATFORM_SETTINGS",
      entityId: settings._id,
      action: "UPDATE",
      performedBy: session.user.id,
      role: session.user.role,
      before,
      after: settings.toObject(),
    });

    return successResponse(200, "Platform settings updated", settings);
  } catch (error) {
    console.error("Platform settings PUT error:", error);
    return errorResponse(500, "Failed to save platform settings");
  }
}
