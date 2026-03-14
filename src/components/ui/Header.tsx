"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthManager';
import styles from '@/styles/theme.module.css';

export function Header() {
  const { logout } = useAuth();
  
  return (
    <header className={styles.header}>
      <div className={styles.nav}>
        <Link href="/" className={styles.navLink}>Chat</Link>
        <Link href="/arena" className={styles.navLink}>Arena</Link>
      </div>
      <div>
        <button className={styles.button} onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
