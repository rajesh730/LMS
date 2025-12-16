import { redirect } from 'next/navigation';

export default function RegisterTeacherPage() {
  redirect('/school/dashboard?tab=register-teacher');
}
