import { redirect } from 'next/navigation';

export default function StudentRegistrationPage() {
  redirect('/school/dashboard?tab=register-student');
}
