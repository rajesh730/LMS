import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FaCommentDots } from "react-icons/fa";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import AdminFeedbackDashboard from "@/components/feedback/AdminFeedbackDashboard";
import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "Feedback - Admin Panel",
  description: "Review student and school feedback.",
};

export default async function AdminFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <PageHeader
        icon={FaCommentDots}
        eyebrow="Admin"
        title="Feedback"
        description="Review feedback submitted by students and schools."
      />
      <div className="mt-5">
        <AdminFeedbackDashboard />
      </div>
    </DashboardLayout>
  );
}
