import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StudentEventWorkspace from "@/components/student/StudentEventWorkspace";

export const metadata = {
  title: "Event Hub - Participate in School Events",
  description: "Browse and participate in upcoming school events",
};

export default async function StudentEventsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <StudentEventWorkspace />
    </DashboardLayout>
  );
}
