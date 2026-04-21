import type { Metadata } from 'next';
import '../styles/globals.css';
import { TRPCProvider } from '@/components/TRPCProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastContainer } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Company Community',
  description: 'Corporate community platform for real/anonymous discussions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-slate-900">
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
          <ToastContainer />
        </TRPCProvider>
      </body>
    </html>
  );
}
