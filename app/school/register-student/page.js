"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import EnhancedStudentRegistration from "../../../components/EnhancedStudentRegistration";
import DashboardLayout from "../../../components/DashboardLayout";

export default function StudentRegistrationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  // Only school admins can register students
  if (session.user.role !== "SCHOOL_ADMIN") {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">
            Only school administrators can register students.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-8">
        <EnhancedStudentRegistration
          schoolId={session.user.schoolId || session.user.id}
          onSuccess={() => {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
          }}
        />
        {success && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
            Student registered successfully!
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
