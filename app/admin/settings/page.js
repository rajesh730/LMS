import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FaCog } from "react-icons/fa";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import AdminTopNav from "@/components/AdminTopNav";
import SuperAdminSettingsManager from "@/components/settings/SuperAdminSettingsManager";
import connectDB from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Settings - Admin Panel",
  description: "Manage platform-wide defaults, governance, and operational policy.",
};

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  await connectDB();
  const pendingCount = await User.countDocuments({
    role: "SCHOOL_ADMIN",
    status: "PENDING",
  });

  return (
    <DashboardLayout>
      <AdminTopNav pendingCount={pendingCount} />
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 flex items-center gap-3 text-4xl font-bold text-white">
            <FaCog className="text-blue-400" />
            Platform Settings
          </h1>
          <p className="text-slate-400">
            Manage the global defaults and governance rules that shape every
            school workspace and platform event.
          </p>
        </div>

        <SuperAdminSettingsManager />
      </div>
    </DashboardLayout>
  );
}
