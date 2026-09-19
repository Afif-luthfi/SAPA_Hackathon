import { useCallback, useEffect, useState } from 'react';
import { checkPackVerdict } from './pack';
import { subscribeRegistryChanges } from './store';
import type { PackVerdict } from './pack';

export function usePackVerdict(): { verdict: PackVerdict; recheck: () => Promise<void> } {
  const [verdict, setVerdict] = useState<PackVerdict>({ state: 'checking' });
  const recheck = useCallback(async () => {
    setVerdict({ state: 'checking' });
    setVerdict(await checkPackVerdict());
  }, []);
  useEffect(() => {
    const unsubscribe = subscribeRegistryChanges(() => void recheck());
    void recheck();
    return unsubscribe;
  }, [recheck]);
  return { verdict, recheck };
}