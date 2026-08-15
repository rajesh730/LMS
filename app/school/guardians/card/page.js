import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import ParentActivation from "@/models/ParentActivation";
import ParentStudentLink from "@/models/ParentStudentLink";
import Parent from "@/models/Parent";
import Student from "@/models/Student";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSessionSchoolId, sameId } from "@/lib/authz";
import ParentAccessCard from "@/components/school/ParentAccessCard";
import PrintButton from "@/components/school/PrintButton";

export const dynamic = "force-dynamic";

/**
 * The print page for a Parent Access Card (§5).
 *
 * The activation PIN and QR token are NOT stored in readable form, so they
 * cannot be looked up here — they arrive as query parameters, handed straight
 * from the create-access response to this page, and exist only for the moment
 * it takes to print.
 *
 * That has one consequence worth being explicit about: **reloading this page
 * after closing it will not bring the card back.** The school must reissue,
 * which invalidates the old card. That is the correct trade-off — a card that
 * can be re-rendered on demand from the database is a permanent, printable key
 * to a child's record sitting in storage.
 *
 * Server-rendered so the QR never touches the client, and gated by the same
 * tenant checks as every other guardian route (§56).
 */
export default async function ParentAccessCardPage({ searchParams }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session?.user?.role)) {
    redirect("/login");
  }

  const activationId = String(params?.activation || "").trim();
  const pin = String(params?.pin || "").trim();
  const token = String(params?.token || "").trim();

  if (!activationId || !pin || !token) {
    return <MissingCard reason="This card link is incomplete." />;
  }

  await connectDB();

  const activation = await ParentActivation.findById(activationId)
    .select("parent school student expiresAt status")
    .lean();

  if (!activation) {
    return <MissingCard reason="This card is no longer available." />;
  }

  // Tenant isolation: a School A admin must not be able to print a School B
  // guardian's card by guessing an activation id (§56).
  const schoolId = getSessionSchoolId(session);
  if (
    session.user.role !== "SUPER_ADMIN" &&
    !sameId(schoolId, activation.school)
  ) {
    return <MissingCard reason="This card is not available to your school." />;
  }

  const [parent, student, school, link] = await Promise.all([
    Parent.findById(activation.parent).select("name parentId").lean(),
    activation.student
      ? Student.findById(activation.student).select("name grade").lean()
      : null,
    User.findById(activation.school).select("schoolName name").lean(),
    ParentStudentLink.findOne({
      parent: activation.parent,
      student: activation.student,
    })
      .select("relationshipType")
      .lean(),
  ]);

  if (!parent) {
    return <MissingCard reason="This guardian no longer exists." />;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const activateUrl = `${siteUrl}/parent/activate?t=${encodeURIComponent(token)}`;

  return (
    <main className="card-page">
      <div className="card-toolbar">
        <div>
          <h1 className="card-toolbar-title">Parent Access Card</h1>
          <p className="card-toolbar-note">
            Print this now — the PIN cannot be shown again. If it is lost, issue
            a new card.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="card-sheet">
        <ParentAccessCard
          schoolName={school?.schoolName || school?.name || "School"}
          studentName={student?.name || "Your child"}
          studentGrade={student?.grade || ""}
          guardianName={parent.name}
          relationshipLabel={relationshipLabel(link?.relationshipType)}
          parentIdentifier={parent.parentId}
          activationPin={pin}
          activateUrl={activateUrl}
          expiresAt={activation.expiresAt}
        />
      </div>
    </main>
  );
}

function MissingCard({ reason }) {
  return (
    <main className="card-page">
      <div className="card-missing">
        <p className="card-missing-icon" aria-hidden="true">
          🔒
        </p>
        <h1 className="card-missing-title">Card not available</h1>
        <p className="card-missing-text">{reason}</p>
        <p className="card-missing-text">
          Go back to Parents &amp; Guardians and choose{" "}
          <strong>Reissue access</strong> to print a new card.
        </p>
      </div>
    </main>
  );
}

function relationshipLabel(value) {
  if (!value) return "";
  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
