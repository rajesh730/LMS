import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentMagazineIssueReader from "@/components/student/StudentMagazineIssueReader";

export const metadata = {
  title: "Read Magazine",
  description: "Read a full school magazine issue",
};

export default async function StudentMagazineIssuePage({ params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  const resolvedParams = await params;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <StudentMagazineIssueReader issueId={resolvedParams.id} />
      </div>
    </DashboardLayout>
  );
}
