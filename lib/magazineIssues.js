import MagazineIssue from "@/models/MagazineIssue";

export function getWeekBounds(date = new Date()) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() + mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

function getMonthName(month, year) {
  return new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
}

function buildIssueTitle({ issueNumber, month, year }) {
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  return `${monthName} Magazine ${issueNumber}`;
}

export async function getOrCreateCurrentMagazineIssue(schoolId, date = new Date()) {
  const issueDate = new Date(date);
  const month = issueDate.getMonth() + 1;
  const year = issueDate.getFullYear();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const issueCount = await MagazineIssue.countDocuments({
    school: schoolId,
    month,
    year,
  });
  const issueNumber = issueCount + 1;
  const title = buildIssueTitle({ issueNumber, month, year });

  return MagazineIssue.create({
    school: schoolId,
    weekStart: issueDate,
    weekEnd: monthEnd,
    weekNumber: issueNumber,
    month,
    year,
    title,
    status: "DRAFT",
    publishedAt: null,
  });
}

export async function getCurrentMagazineIssue(schoolId) {
  return MagazineIssue.findOne({ school: schoolId }).sort({
    weekStart: -1,
    createdAt: -1,
  });
}

export function serializeMagazineIssue(issue) {
  if (!issue) return null;
  const issueDate =
    issue.publishedAt || issue.weekStart || issue.createdAt || new Date();
  const date = new Date(issueDate);
  const month = issue.month || date.getMonth() + 1;
  const year = issue.year || date.getFullYear();
  const weekNumber = issue.weekNumber || 1;
  const title =
    month && year && weekNumber
      ? buildIssueTitle({ issueNumber: weekNumber, month, year })
      : issue.title;

  return {
    id: String(issue._id),
    title,
    weekStart: issue.weekStart,
    weekEnd: issue.weekEnd,
    weekNumber,
    month,
    monthLabel: month && year ? `${getMonthName(month, year)} ${year}` : "",
    year,
    status: issue.status,
    publishedAt: issue.publishedAt,
    showOnHome: Boolean(issue.showOnHome),
    homeShownAt: issue.homeShownAt,
  };
}
