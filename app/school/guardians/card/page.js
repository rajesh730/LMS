import { redirect } from "next/navigation";
import { headers } from "next/headers";
import connectDB from "@/lib/db";
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
 * **This page is re-printable, and that is a deliberate change.** It used to
 * take the PIN and QR token as query parameters because neither was stored in
 * readable form, which meant closing the tab destroyed the card and the school
 * had to reissue — invalidating the guardian's access to reprint a piece of
 * paper. Now the card carries only the Parent ID, which IS stored in readable
 * form, so the card can be rendered from the database any time the school needs
 * another copy. Reprinting no longer disturbs a connected guardian.
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

  const linkId = String(params?.link || "").trim();
  if (!linkId) {
    return <MissingCard reason="This card link is incomplete." />;
  }

  await connectDB();

  const link = await ParentStudentLink.findById(linkId)
    .select("parent student school relationshipType")
    .lean()
    // An id that is not a valid ObjectId must read as "not found", not a crash.
    .catch(() => null);

  if (!link) {
    return <MissingCard reason="This guardian could not be found." />;
  }

  // Tenant isolation: a School A admin must not be able to print a School B
  // guardian's card by guessing a link id (§56).
  const schoolId = getSessionSchoolId(session);
  if (session.user.role !== "SUPER_ADMIN" && !sameId(schoolId, link.school)) {
    return <MissingCard reason="This card is not available to your school." />;
  }

  const [parent, student, school] = await Promise.all([
    Parent.findById(link.parent).select("name parentId isHousehold householdName").lean(),
    link.student
      ? Student.findById(link.student).select("name grade").lean()
      : null,
    User.findById(link.school).select("schoolName name").lean(),
  ]);

  if (!parent?.parentId) {
    return <MissingCard reason="This guardian has no Parent ID yet." />;
  }

  return (
    <main className="card-page">
      <div className="card-toolbar">
        <div>
          <h1 className="card-toolbar-title">Parent Access Card</h1>
          <p className="card-toolbar-note">
            Print this and hand it to the guardian. You can print it again later
            — reprinting does not disturb a guardian who is already signed in.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="card-sheet">
        <ParentAccessCard
          schoolName={school?.schoolName || school?.name || "School"}
          studentName={student?.name || "Your child"}
          studentGrade={student?.grade || ""}
          guardianName={
            parent.isHousehold ? parent.householdName || parent.name : parent.name
          }
          relationshipLabel={relationshipLabel(link.relationshipType)}
          parentIdentifier={parent.parentId}
          loginUrl={`${await resolveSiteUrl()}/parent/login?id=${encodeURIComponent(
            parent.parentId
          )}`}
        />
      </div>
    </main>
  );
}

/**
 * The absolute origin to encode into the QR.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when set, but it is exactly the kind of variable
 * that goes stale after a domain move — and a card printed with a dead host is
 * a card nobody can use, discovered weeks later at the school gate. Falling
 * back to the request's own host means the QR always points at the deployment
 * the card was printed from.
 */
async function resolveSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  if (!host) return "";

  const protocol =
    headerList.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
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
          Go back to Parents &amp; Guardians to check this guardian&apos;s access.
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
