import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EventDetailDashboard from "@/components/events/EventDetailDashboard";

export const metadata = {
  title: "Event Management Dashboard",
  description: "Manage event participation and approvals",
};

export default async function EventManagementPage({ params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user has permission to manage events
  if (!["SCHOOL_ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/");
  }

  return <EventDetailDashboard />;
}
