"use client";

import DashboardLayout from "@/components/DashboardLayout";
import ExamManager from "@/components/dashboard/ExamManager";

export default function ExamsPage() {
  return (
    <DashboardLayout role="admin">
      <div className="p-6">
        <ExamManager />
      </div>
    </DashboardLayout>
  );
}
