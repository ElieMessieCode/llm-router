import React from 'react';
import '../styles/globals.css';
import styles from '../styles/theme.module.css';
import Link from 'next/link';
import { AuthProvider } from '../lib/auth/AuthManager';
import { Header } from '../components/ui/Header';

export const metadata = {
  title: 'LLM Router',
  description: 'Minimalist LLM interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className={styles.main}>
          <AuthProvider>
            <Header />
            {children}
          </AuthProvider>
        </main>
      </body>
    </html>
  );
}
