import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AdminSupportDashboard from "@/components/support/AdminSupportDashboard";
import { FaHeadset } from "react-icons/fa";

export const metadata = {
  title: "Support Tickets - Admin Panel",
  description: "Manage school support tickets and responses",
};

export default async function AdminSupportPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FaHeadset className="text-blue-400" /> Support Ticket Management
          </h1>
          <p className="text-slate-400">
            Manage and respond to school support requests
          </p>
        </div>

        <AdminSupportDashboard />
      </div>
    </DashboardLayout>
  );
}
