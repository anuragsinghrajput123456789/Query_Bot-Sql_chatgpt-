import { redirect } from 'next/navigation';
import HomeClient from '@/app/HomeClient';
import { getCurrentUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <HomeClient user={user} />;
}
