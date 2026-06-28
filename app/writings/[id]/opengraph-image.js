import { ImageResponse } from "next/og";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { stripWritingMarkup } from "@/components/WritingContent";
import "@/models/Student";
import "@/models/User";

// A personalized share card for a published student writing.
export const runtime = "nodejs";
export const alt = "Student writing on Pravyo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function categoryLabel(value) {
  return String(value || "Writing").replaceAll("_", " ").toUpperCase();
}

function clamp(text, max) {
  const value = String(text || "").trim();
  return value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;
}

async function getCardData(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();

  const article = await SchoolMagazineArticle.findOne({
    _id: id,
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
  })
    .select("title content category authorStudent school")
    .populate("authorStudent", "name")
    .populate("school", "schoolName")
    .lean();
  if (!article) return null;

  return {
    title: article.title || "Student Writing",
    category: article.category,
    author: article.authorStudent?.name || "A student",
    school: article.school?.schoolName || "Pravyo",
    excerpt: stripWritingMarkup(article.content || "").replace(/\s+/g, " ").trim(),
  };
}

export default async function Image({ params }) {
  const { id } = await params;
  const data = await getCardData(id).catch(() => null);

  const title = clamp(data?.title || "Student Writing", 90);
  const excerpt = clamp(data?.excerpt || "", 150);
  const byline = data
    ? `by ${data.author} - ${data.school}`
    : "Read student voices on Pravyo";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          color: "#10142f",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 3, color: "#1f4e79" }}>
            PRAVYO
          </div>
          <div
            style={{
              display: "flex",
              background: "#f1edff",
              color: "#1f4e79",
              padding: "10px 24px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            {categoryLabel(data?.category)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.08 }}>
            {title}
          </div>
          {excerpt ? (
            <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: "#46536b" }}>
              {excerpt}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #eceef8",
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#526071" }}>
            {byline}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, color: "#1f4e79" }}>
            Read on Pravyo
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
