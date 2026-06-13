import { redirect } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import PublicNavbar from '@/components/marketing/PublicNavbar';
import { getCurrentUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/workspace');
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-app-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-70" />
      <PublicNavbar user={null} />
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <AuthForm mode="signup" />
      </main>
    </div>
  );
}
