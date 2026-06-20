import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EventDetailDashboard from "@/components/events/EventDetailDashboard";

export const metadata = {
  title: "Event Details",
  description: "View event overview, rounds, notices, and results",
};

export default async function StudentEventDetailPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/student/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/");
  }

  // Renders the same dashboard schools use, in read-only mode (driven by the
  // STUDENT role inside ManagementTabs).
  return <EventDetailDashboard />;
}
