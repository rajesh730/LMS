import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentMagazineArticleReader from "@/components/student/StudentMagazineArticleReader";

export const metadata = {
  title: "Read Global Wall Writing",
  description: "Read a full writing post from the Global Wall",
};

export default async function StudentGlobalWallArticlePage({ params }) {
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
          apiBasePath="/api/student/global-wall"
          backHref="/student/global-wall"
          backLabel="Back to global wall"
          relatedHrefPrefix="/student/global-wall/"
          relatedTitle="More Global Wall Writing"
        />
      </div>
    </DashboardLayout>
  );
}
