import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardLayout from "@/components/DashboardLayout";
import AdminTopNav from "@/components/AdminTopNav";
import AdminDiagnosticsPanel from "@/components/admin/AdminDiagnosticsPanel";

export const metadata = {
  title: "Platform Diagnostics",
  description: "Internal diagnostics for realtime, notices, and public activity",
};

export default async function AdminDiagnosticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <AdminTopNav />
      <AdminDiagnosticsPanel />
    </DashboardLayout>
  );
}
