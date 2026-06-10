import React from 'react';
import { useRxStore } from '@/store/rxStore';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

const MASTER_ADMIN_PHONE = '8011692945';

export default function AdminAuthGuard({
  children,
}: AdminAuthGuardProps) {
  const { user } = useRxStore();

  // User not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Login Required
          </h1>
          <p className="text-white/60">
            Please login to continue.
          </p>
        </div>
      </div>
    );
  }

  // Master Admin Access
  if (user.phone_number === MASTER_ADMIN_PHONE) {
    return <>{children}</>;
  }

  // Block all non-admin users
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F] p-4">
      <div className="max-w-md w-full bg-white/5 border border-red-500/20 rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-black text-red-500 mb-3">
          Access Denied
        </h1>

        <p className="text-white/70">
          You are not authorized to access the Omniverse Admin Panel.
        </p>
      </div>
    </div>
  );
}
