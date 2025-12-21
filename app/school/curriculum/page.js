import CurriculumManager from '@/components/CurriculumManager';
import DashboardLayout from '@/components/DashboardLayout';

export default function CurriculumPage() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Curriculum Management</h1>
        <p className="text-slate-400">Manage your school's subjects</p>
      </div>
      
      <CurriculumManager />
    </DashboardLayout>
  );
}
