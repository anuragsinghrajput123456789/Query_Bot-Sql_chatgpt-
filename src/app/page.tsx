import LandingPage from '@/components/marketing/LandingPage';
import { getCurrentUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();
  return <LandingPage user={user} />;
}
