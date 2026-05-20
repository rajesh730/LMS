"use client";

import NoticeManager from "@/components/NoticeManager";

export default function StudentNoticeManager() {
  return (
    <NoticeManager
      title="Student Notices"
      subtitle="Create, publish, edit, and manage notices sent from your school to students."
      fixedAudience="students"
    />
  );
}
