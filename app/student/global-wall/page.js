import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentSchoolMagazine from "@/components/student/StudentSchoolMagazine";

export const metadata = {
  title: "Global Wall",
  description: "Read student writing shared beyond your school",
};

export default async function StudentGlobalWallPage() {
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
        <StudentSchoolMagazine initialView="global" lockedView />
      </div>
    </DashboardLayout>
  );
}
