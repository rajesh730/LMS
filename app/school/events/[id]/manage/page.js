import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EventDetailDashboard from "@/components/events/EventDetailDashboard";

export const metadata = {
  title: "School Event Management",
  description: "Manage school event participants, rounds, results, and certificates",
};

export default async function SchoolEventManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/");
  }

  return <EventDetailDashboard />;
}
