import ActivityLog from "@/models/ActivityLog";
import connectDB from "@/lib/db";

/**
 * Log an admin action for audit trail
 *
 * @param {Object} options - Logging options
 * @param {String} options.action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {String} options.targetType - Type of entity (Student, Teacher, etc.)
 * @param {String} options.targetId - ID of the entity
 * @param {String} options.targetName - Human-readable name
 * @param {String} options.performedBy - User ID who performed action
 * @param {String} options.school - School/Admin ID
 * @param {Object} options.changes - Before/after changes (optional)
 * @param {Object} options.details - Additional details (optional)
 * @param {String} options.status - SUCCESS or FAILED
 * @param {String} options.errorMessage - Error message if failed (optional)
 */
export async function logActivity(options) {
  try {
    await connectDB();

    const log = new ActivityLog({
      action: options.action,
      targetType: options.targetType,
      targetId: options.targetId,
      targetName: options.targetName,
      performedBy: options.performedBy,
      school: options.school,
      changes: options.changes || null,
      details: options.details || {},
      status: options.status || "SUCCESS",
      errorMessage: options.errorMessage || null,
    });

    await log.save();
    return log;
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - logging should not break the main operation
    return null;
  }
}

/**
 * Get activity logs for a school with filters
 *
 * @param {String} schoolId - School/Admin ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Activity logs
 */
export async function getActivityLogs(schoolId, filters = {}) {
  try {
    await connectDB();

    const query = { school: schoolId };

    if (filters.action) query.action = filters.action;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.performedBy) query.performedBy = filters.performedBy;
    if (filters.status) query.status = filters.status;

    const logs = await ActivityLog.find(query)
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .lean();

    return logs;
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return [];
  }
}

/**
 * Get activity summary for dashboard
 * Shows recent actions and statistics
 */
export async function getActivitySummary(schoolId, daysBack = 7) {
  try {
    await connectDB();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const logs = await ActivityLog.find({
      school: schoolId,
      createdAt: { $gte: startDate },
    })
      .populate("performedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return {
      totalActions: logs.length,
      recentActions: logs.slice(0, 10),
      actionsByType: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      actionsByTarget: logs.reduce((acc, log) => {
        acc[log.targetType] = (acc[log.targetType] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error("Failed to get activity summary:", error);
    return {
      totalActions: 0,
      recentActions: [],
      actionsByType: {},
      actionsByTarget: {},
    };
  }
}
