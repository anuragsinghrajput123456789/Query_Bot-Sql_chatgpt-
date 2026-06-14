import React from 'react';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/auth/session';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  let user = null;
  if (sessionCookie) {
    const payload = decryptSession(sessionCookie.value);
    if (payload) {
      user = {
        id: payload.userId,
        username: payload.username,
        role: payload.role as 'user' | 'admin',
      };
    }
  }

  return <AnalyticsClient user={user} />;
}
