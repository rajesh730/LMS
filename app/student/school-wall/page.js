import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentSchoolMagazine from "@/components/student/StudentSchoolMagazine";

export const metadata = {
  title: "School Wall",
  description: "Read writing posted by students from your school",
};

export default async function StudentSchoolWallPage() {
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
        <StudentSchoolMagazine initialView="school-wall" lockedView />
      </div>
    </DashboardLayout>
  );
}
