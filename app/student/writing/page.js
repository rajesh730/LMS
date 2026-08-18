import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import DashboardLayout from "@/components/DashboardLayout";
import StudentWritingWorkspace from "@/components/student/StudentWritingWorkspace";

export const metadata = {
  title: "My Writing",
  description: "Save private writing or post it to your school wall",
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
