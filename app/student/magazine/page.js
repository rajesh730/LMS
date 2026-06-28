import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentMagazineLibrary from "@/components/student/StudentMagazineLibrary";

export const metadata = {
  title: "School Magazine",
  description: "Read weekly school magazine issues",
};

export default async function StudentMagazinePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <StudentMagazineLibrary />
      </div>
    </DashboardLayout>
  );
}
