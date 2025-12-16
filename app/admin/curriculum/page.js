import GlobalCurriculumManager from '@/components/GlobalCurriculumManager';
import DashboardLayout from '@/components/DashboardLayout';
import AdminTopNav from '@/components/AdminTopNav';
import connectDB from '@/lib/db';
import User from '@/models/User';

export default async function AdminCurriculumPage() {
  await connectDB();
  const pendingCount = await User.countDocuments({ role: 'SCHOOL_ADMIN', status: 'PENDING' });

  return (
    <DashboardLayout>
      <AdminTopNav pendingCount={pendingCount} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Global Curriculum</h1>
        <p className="text-slate-400">Manage the master list of subjects available to all schools</p>
      </div>
      
      <GlobalCurriculumManager />
    </DashboardLayout>
  );
}
