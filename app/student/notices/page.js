import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import StudentNoticeBoard from "@/components/student/StudentNoticeBoard";
import StudentNotificationCenter from "@/components/student/StudentNotificationCenter";

export const metadata = {
  title: "Student Notices",
  description: "School and event notices for students",
};

export default async function StudentNoticesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#17120a]">Student Notices</h1>
            <p className="mt-2 text-[#52657d]">
              Keep up with school announcements and published event updates.
            </p>
          </div>
          <StudentNotificationCenter />
        </div>

        <StudentNoticeBoard />
      </div>
    </DashboardLayout>
  );
}
