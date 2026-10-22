import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { getProfile } from '../../db/repositories';
import { useQuery } from '../../hooks/useQuery';

/** Sends new users to onboarding until a profile exists. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: profile, loading } = useQuery(['profile'], getProfile);

  useEffect(() => {
    if (loading) return;
    const onOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
    if (!profile && !onOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (profile && onOnboarding) {
      router.replace('/');
    }
  }, [loading, profile, pathname, router]);

  return children;
}
