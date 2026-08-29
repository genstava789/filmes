import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';
import siteConfig from '@/config';

export const metadata: Metadata = {
  title: `Masuk atau Daftar - ${siteConfig.name}`,
  description: `Masuk ke akun ${siteConfig.name} Anda untuk menyimpan watchlist, melanjutkan tontonan, dan menikmati film serta serial favorit.`,
};

function LoginLoadingFallback() {
  return (
    <div className="w-full min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[380px] h-[300px] rounded-3xl p-6 sm:p-8 bg-[#090e20]/60 border border-white/10 flex items-center justify-center">
        <div
          className="rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"
          style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
