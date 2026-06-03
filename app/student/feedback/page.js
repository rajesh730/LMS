"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FaCommentDots } from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import FeedbackForm from "@/components/feedback/FeedbackForm";
import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";

export default function StudentFeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [router, status]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState title="Opening feedback" message="Preparing feedback form." />
      </DashboardLayout>
    );
  }

  if (session?.user?.role !== "STUDENT") {
    return (
      <DashboardLayout>
        <AlertBanner
          type="error"
          title="Student access required"
          message="Please sign in with a student account to send feedback."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          icon={FaCommentDots}
          eyebrow="Student feedback"
          title="Feedback"
          description="Share what is working well or what should be improved."
        />
        <div className="mt-5">
          <FeedbackForm audience="student" />
        </div>
      </div>
    </DashboardLayout>
  );
}
