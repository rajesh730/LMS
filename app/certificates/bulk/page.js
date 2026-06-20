import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { getActiveCertificateFilter } from "@/lib/certificates";
import BulkCertificateFrames from "@/components/certificates/BulkCertificateFrames";

export const dynamic = "force-dynamic";

const MAX_BULK_CERTIFICATES = 80;

function parseIds(value = "") {
  return String(value)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_BULK_CERTIFICATES);
}

function canViewCertificate(achievement, session) {
  const role = session?.user?.role;
  if (role === "SUPER_ADMIN") return true;

  const schoolId = String(achievement.school?._id || achievement.school || "");
  const userSchoolId = String(session?.user?.schoolId || session?.user?.id || "");
  const studentId = String(achievement.student?._id || achievement.student || "");
  const userId = String(session?.user?.id || "");

  if (role === "SCHOOL_ADMIN") return userSchoolId === schoolId;
  if (role === "TEACHER") return String(session?.user?.schoolId || "") === schoolId;
  if (role === "STUDENT") return userId === studentId;

  return false;
}

export default async function BulkCertificatePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const ids = parseIds(resolvedSearchParams?.ids);
  const autoPrint = resolvedSearchParams?.download === "pdf";
  const session = await getServerSession(authOptions);

  if (!session || ids.length === 0) {
    notFound();
  }

  await connectDB();

  const certificates = await Achievement.find({
    _id: { $in: ids },
    ...getActiveCertificateFilter(),
  })
    .populate("school", "schoolName")
    .populate("student", "name")
    .select("_id school student certificateRecipientName teamName")
    .lean();

  const certificateById = new Map(
    certificates
      .filter((certificate) => canViewCertificate(certificate, session))
      .map((certificate) => [String(certificate._id), certificate])
  );
  const orderedCertificates = ids
    .map((id) => certificateById.get(id))
    .filter(Boolean);

  if (orderedCertificates.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#eef1f7] px-4 py-6 text-[#10142f] print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl print:max-w-none">
        <BulkCertificateFrames
          autoPrint={autoPrint}
          certificates={orderedCertificates.map((certificate) => ({
            id: String(certificate._id),
            label:
              certificate.certificateRecipientName ||
              certificate.teamName ||
              certificate.student?.name ||
              String(certificate._id),
          }))}
        />
      </div>
    </main>
  );
}
