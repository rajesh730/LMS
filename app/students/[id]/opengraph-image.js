import { ImageResponse } from "next/og";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import Achievement from "@/models/Achievement";
import { getActiveCertificateFilter } from "@/lib/certificates";
import "@/models/User";

// A personalized share card for a verified student portfolio — the image people
// see when they post a profile link on WhatsApp / Facebook / X.
export const runtime = "nodejs";
export const alt = "Verified Student Portfolio on Pravyo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getCardData(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();

  const student = await Student.findOne({
    _id: id,
    isDeleted: { $ne: true },
    status: { $ne: "INACTIVE" },
  })
    .select("name school")
    .populate("school", "schoolName")
    .lean();
  if (!student) return null;

  const [writings, achievements] = await Promise.all([
    SchoolMagazineArticle.countDocuments({
      authorStudent: student._id,
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    }),
    Achievement.countDocuments({
      student: student._id,
      isPublic: true,
      ...getActiveCertificateFilter(),
    }),
  ]);

  return {
    name: student.name || "Student",
    school: student.school?.schoolName || "Pravyo",
    writings,
    achievements,
  };
}

export default async function Image({ params }) {
  const { id } = await params;
  const data = await getCardData(id).catch(() => null);

  const name = data?.name || "Verified Student";
  const school = data?.school || "Pravyo";
  const chips = [
    data?.achievements
      ? `${data.achievements} ${data.achievements === 1 ? "Achievement" : "Achievements"}`
      : "",
    data?.writings
      ? `${data.writings} ${data.writings === 1 ? "Published Piece" : "Published Pieces"}`
      : "",
  ].filter(Boolean);
  const statLine = chips.length
    ? chips.join("     |     ")
    : "Verified student records on Pravyo";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#3a1fd1",
          color: "#ffffff",
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
          <div style={{ display: "flex", fontSize: 38, fontWeight: 800, letterSpacing: 3 }}>
            PRAVYO
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#5a48f0",
              padding: "12px 26px",
              borderRadius: 999,
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            Verified Portfolio
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, marginTop: 14, color: "#d8d2ff" }}>
            {school}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            backgroundColor: "#5a48f0",
            borderRadius: 20,
            padding: "26px 36px",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          {statLine}
        </div>
      </div>
    ),
    { ...size }
  );
}
