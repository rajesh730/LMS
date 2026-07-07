export const LEGACY_SCHOOL_ROLE_SEED = [
  "Mentor",
  "Program Lead",
  "Events Coordinator",
];

export function normalizeTeacherRoles(roles = []) {
  return roles
    .map((role) => (role === "Club Lead" ? "Program Lead" : String(role || "").trim()))
    .filter(Boolean);
}

export function sameRoleSet(a = [], b = []) {
  return JSON.stringify(normalizeTeacherRoles(a)) === JSON.stringify(normalizeTeacherRoles(b));
}

export function inferTeacherRoleCustomization(config, platformRoles) {
  if (typeof config?.teacherRolesCustomized === "boolean") {
    return config.teacherRolesCustomized;
  }

  const configRoles = normalizeTeacherRoles(config?.teacherRoles || []);

  if (configRoles.length === 0) return false;
  if (sameRoleSet(configRoles, platformRoles)) return false;
  if (sameRoleSet(configRoles, LEGACY_SCHOOL_ROLE_SEED)) return false;

  return true;
}

export function getEffectiveTeacherRoles(config, platformRoles) {
  const isCustomized = inferTeacherRoleCustomization(config, platformRoles);
  return {
    teacherRolesCustomized: isCustomized,
    teacherRoleSource: isCustomized ? "SCHOOL_CUSTOM" : "PLATFORM_DEFAULT",
    effectiveTeacherRoles: isCustomized
      ? normalizeTeacherRoles(config?.teacherRoles || [])
      : normalizeTeacherRoles(platformRoles),
  };
}
