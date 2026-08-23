import { NextResponse } from "next/server";
import User from "@/models/User";
import Notice from "@/models/Notice";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import {
  paginatedData,
  requireWebsiteApiKey,
  websitePagination,
} from "@/lib/websiteApiAuth";

export const dynamic = "force-dynamic";

function response(data) {
  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}

async function list(query, request, map, defaultLimit = 12) {
  const { page, limit, skip } = websitePagination(request, defaultLimit);
  const [rows, total] = await Promise.all([
    query.find.sort(query.sort).skip(skip).limit(limit).lean(),
    query.model.countDocuments(query.filter),
  ]);
  return response(paginatedData(rows.map(map), total, page, limit));
}

export async function GET(request, { params }) {
  try {
    const access = await requireWebsiteApiKey(request);
    if (access.error) return access.error;
    const { resource } = await params;
    const schoolId = access.schoolId;

    if (resource === "school") {
      const [school, profile] = await Promise.all([
        User.findOne({
          _id: schoolId,
          role: "SCHOOL_ADMIN",
          status: { $in: ["APPROVED", "SUBSCRIBED"] },
        })
          .select(
            "schoolName schoolLocation province district municipality ward tole streetAddress postalCode schoolPhone website establishedYear"
          )
          .lean(),
        SchoolShowcaseProfile.findOne({ school: schoolId, visibility: "PUBLIC" })
          .select(
            "tagline summary coverImageUrl websiteUrl motto contactEmail contactPhone socialLinks highlightMetrics publicHighlights"
          )
          .lean(),
      ]);
      if (!school) {
        return NextResponse.json(
          { success: false, code: "SCHOOL_NOT_FOUND", message: "School not found" },
          { status: 404 }
        );
      }
      return response({
        name: school.schoolName || "School",
        location: school.schoolLocation || "",
        address: {
          province: school.province || "",
          district: school.district || "",
          municipality: school.municipality || "",
          ward: school.ward || "",
          tole: school.tole || "",
          street: school.streetAddress || "",
          postalCode: school.postalCode || "",
        },
        phone: profile?.contactPhone || school.schoolPhone || "",
        website: profile?.websiteUrl || school.website || "",
        establishedYear: school.establishedYear || null,
        showcase: profile
          ? {
              tagline: profile.tagline || "",
              summary: profile.summary || "",
              motto: profile.motto || "",
              coverImageUrl: profile.coverImageUrl || "",
              contactEmail: profile.contactEmail || "",
              socialLinks: profile.socialLinks || {},
              highlights: profile.publicHighlights || [],
              metrics: profile.highlightMetrics || {},
            }
          : null,
      });
    }

    if (resource === "notices") {
      const now = new Date();
      const filter = {
        school: schoolId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        isActive: true,
        isDeleted: { $ne: true },
        $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }],
      };
      return list(
        {
          model: Notice,
          filter,
          find: Notice.find(filter).select("title content type priority publishedAt expiryDate"),
          sort: { publishedAt: -1 },
        },
        request,
        (row) => ({
          id: String(row._id),
          title: row.title,
          content: row.content,
          type: row.type,
          priority: row.priority,
          publishedAt: row.publishedAt,
          expiryDate: row.expiryDate,
        })
      );
    }

    if (resource === "events") {
      const filter = {
        school: schoolId,
        eventScope: "SCHOOL",
        status: "APPROVED",
        visibility: "PUBLIC",
        lifecycleStatus: { $ne: "ARCHIVED" },
      };
      return list(
        {
          model: Event,
          filter,
          find: Event.find(filter).select(
            "title description date eventType lifecycleStatus registrationDeadline resultsPublished"
          ),
          sort: { date: -1 },
        },
        request,
        (row) => ({
          id: String(row._id),
          title: row.title,
          description: row.description,
          date: row.date,
          type: row.eventType,
          status: row.lifecycleStatus,
          registrationDeadline: row.registrationDeadline,
          resultsPublished: Boolean(row.resultsPublished),
        })
      );
    }

    if (resource === "writings") {
      const filter = {
        school: schoolId,
        status: "APPROVED",
        isPublished: true,
        isDeleted: { $ne: true },
      };
      const find = SchoolMagazineArticle.find(filter)
        .select("title content category authorStudent authorGrade publishedAt isFeatured")
        .populate("authorStudent", "name");
      return list(
        { model: SchoolMagazineArticle, filter, find, sort: { publishedAt: -1 } },
        request,
        (row) => ({
          id: String(row._id),
          title: row.title,
          content: row.content,
          category: row.category,
          authorName: row.authorStudent?.name || "Student",
          authorGrade: row.authorGrade || "",
          publishedAt: row.publishedAt,
          featured: Boolean(row.isFeatured),
        })
      );
    }

    if (resource === "achievements") {
      const filter = { school: schoolId, isPublic: true };
      const find = Achievement.find(filter)
        .select(
          "student recipientType teamName title description level placement certificateRecipientName awardedAt"
        )
        .populate("student", "name");
      return list(
        { model: Achievement, filter, find, sort: { awardedAt: -1 } },
        request,
        (row) => ({
          id: String(row._id),
          title: row.title,
          description: row.description || "",
          recipientType: row.recipientType,
          recipientName:
            row.certificateRecipientName || row.teamName || row.student?.name || "Student",
          level: row.level,
          placement: row.placement,
          awardedAt: row.awardedAt,
        })
      );
    }

    if (resource === "magazines") {
      const filter = { school: schoolId, status: "PUBLISHED" };
      return list(
        {
          model: MagazineIssue,
          filter,
          find: MagazineIssue.find(filter).select(
            "title weekStart weekEnd weekNumber month year publishedAt articles"
          ),
          sort: { publishedAt: -1, weekStart: -1 },
        },
        request,
        (row) => ({
          id: String(row._id),
          title: row.title,
          weekStart: row.weekStart,
          weekEnd: row.weekEnd,
          weekNumber: row.weekNumber,
          month: row.month,
          year: row.year,
          publishedAt: row.publishedAt,
          articleCount: row.articles?.length || 0,
        })
      );
    }

    return NextResponse.json(
      { success: false, code: "RESOURCE_NOT_FOUND", message: "Unknown website resource" },
      { status: 404 }
    );
  } catch (error) {
    console.error("GET website API error:", error);
    return NextResponse.json(
      { success: false, code: "INTERNAL_SERVER_ERROR", message: "Website API request failed" },
      { status: 500 }
    );
  }
}
