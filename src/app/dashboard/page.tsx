import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getCurrentSession();
  redirect(session ? '/dashboard/overview' : '/auth/sign-in');
}
