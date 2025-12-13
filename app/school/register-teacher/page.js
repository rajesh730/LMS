"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EnhancedTeacherRegistration from "@/components/EnhancedTeacherRegistration";
import DashboardLayout from "@/components/DashboardLayout";

export default function RegisterTeacherPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (!isClient || status === "loading") {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout role="school">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Teacher Registration</h1>
            <p className="text-slate-400">Add new teachers to your school</p>
          </div>
        </div>

        <EnhancedTeacherRegistration 
          schoolId={session.user.id} 
          onSuccess={() => router.refresh()} 
        />
      </div>
    </DashboardLayout>
  );
}
