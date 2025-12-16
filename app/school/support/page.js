import { redirect } from 'next/navigation';

export default function SchoolSupportPage() {
  redirect('/school/dashboard?tab=support');
}
