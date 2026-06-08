import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentMagazineArticleReader from "@/components/student/StudentMagazineArticleReader";

export const metadata = {
  title: "Read School Wall Writing",
  description: "Read a full writing post from your school wall",
};

export default async function StudentSchoolWallArticlePage({ params }) {
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
        <StudentMagazineArticleReader
          articleId={resolvedParams.id}
          backHref="/student/school-wall"
          backLabel="Back to school wall"
          relatedHrefPrefix="/student/school-wall/"
          relatedTitle="More School Wall Writing"
        />
      </div>
    </DashboardLayout>
  );
}
