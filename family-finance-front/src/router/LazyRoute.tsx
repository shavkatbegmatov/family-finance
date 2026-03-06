import { Suspense, type ReactNode } from 'react';
import { PageLoader } from '../components/common/PageLoader';

export function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}
