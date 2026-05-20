import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentWritingWorkspace from "@/components/student/StudentWritingWorkspace";

export const metadata = {
  title: "My Writing",
  description: "Draft and submit student writing for school magazine review",
};

export default async function StudentWritingPage() {
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
        <StudentWritingWorkspace />
      </div>
    </DashboardLayout>
  );
}
