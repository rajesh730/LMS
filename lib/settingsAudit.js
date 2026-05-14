import AuditLog from "@/models/AuditLog";

export async function recordSettingsAudit({
  entityType,
  entityId,
  action,
  performedBy,
  role,
  before,
  after,
  reason = "",
}) {
  await AuditLog.create({
    entityType,
    entityId,
    action,
    performedBy,
    role,
    reason,
    before,
    after,
  });
}
