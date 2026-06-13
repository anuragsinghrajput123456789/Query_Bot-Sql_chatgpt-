'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
  label?: string;
  compact?: boolean;
}

export default function LogoutButton({
  className = '',
  redirectTo = '/',
  label = 'Logout',
  compact = false,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push(redirectTo);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      type="button"
    >
      <span className="inline-flex items-center gap-2">
        <LogOut size={compact ? 14 : 16} />
        <span>{isLoading ? 'Signing out...' : label}</span>
      </span>
    </button>
  );
}
