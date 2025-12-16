import { redirect } from 'next/navigation';

export default function SchoolSettings() {
  redirect('/school/dashboard?tab=settings');
}
