import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import MagazineIssue from "@/models/MagazineIssue";
import "@/models/SchoolMagazineArticle";
import {
  getCurrentMagazineIssue,
  getOrCreateCurrentMagazineIssue,
  serializeMagazineIssue,
} from "@/lib/magazineIssues";

function serializeIssueWithCount(issue) {
  const serialized = serializeMagazineIssue(issue);
  if (!serialized) return null;
  return {
    ...serialized,
    articleCount: Array.isArray(issue.articles) ? issue.articles.length : 0,
  };
}

function issueDate(issue) {
  return new Date(issue.publishedAt || issue.weekStart || issue.createdAt || 0);
}

function normalizeIssueTitles(issues = []) {
  const grouped = new Map();
  issues.forEach((issue) => {
    const key = `${issue.year}-${issue.month}`;
    const list = grouped.get(key) || [];
    list.push(issue);
    grouped.set(key, list);
  });

  const titleById = new Map();
  grouped.forEach((items) => {
    [...items]
      .sort((a, b) => issueDate(a) - issueDate(b))
      .forEach((issue, index) => {
        const monthName = issueDate(issue).toLocaleDateString("en-US", {
          month: "long",
        });
        titleById.set(String(issue._id), `${monthName} Magazine ${index + 1}`);
      });
  });

  return issues.map((issue) => {
    const serialized = serializeIssueWithCount(issue);
    return serialized
      ? { ...serialized, title: titleById.get(String(issue._id)) || serialized.title }
      : null;
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [currentIssue, issues] = await Promise.all([
      getCurrentMagazineIssue(session.user.id).lean(),
      MagazineIssue.find({ school: session.user.id })
        .sort({ weekStart: -1 })
        .limit(12)
        .lean(),
    ]);

    const normalizedIssues = normalizeIssueTitles(issues).filter(Boolean);
    const normalizedCurrentIssue =
      normalizedIssues.find((issue) => issue.id === String(currentIssue?._id)) ||
      serializeIssueWithCount(currentIssue);

    return NextResponse.json({
      currentIssue: normalizedCurrentIssue,
      issues: normalizedIssues,
    });
  } catch (error) {
    console.error("GET /api/school/magazine-issues error:", error);
    return NextResponse.json(
      { message: "Failed to load magazine issues" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const issue = await getOrCreateCurrentMagazineIssue(session.user.id);
    const serializedIssue = serializeIssueWithCount(issue);

    return NextResponse.json({
      message: `${serializedIssue.title} is ready`,
      issue: serializedIssue,
    });
  } catch (error) {
    console.error("POST /api/school/magazine-issues error:", error);
    return NextResponse.json(
      { message: "Failed to create magazine" },
      { status: 500 }
    );
  }
}
