import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import DashboardLayout from "@/components/DashboardLayout";
import StudentMagazineArticleReader from "@/components/student/StudentMagazineArticleReader";

export const metadata = {
  title: "Read Article",
  description: "Read a full article from your school magazine",
};

export default async function StudentMagazineArticlePage({ params }) {
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
      <div className="student-magazine-article-page mx-auto max-w-7xl">
        <StudentMagazineArticleReader articleId={resolvedParams.id} />
      </div>
    </DashboardLayout>
  );
}
