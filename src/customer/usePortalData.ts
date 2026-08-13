import { useEffect, useState, useCallback } from 'react';
import { useCustomerAuth } from '@/lib/customer-auth';
import type { CustomerPortalData } from '@/types';

export function usePortalData() {
  const { loadPortalData, customerId, loading: authLoading } = useCustomerAuth();
  const [data, setData] = useState<CustomerPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await loadPortalData();
    if (result) {
      setData(result);
    } else {
      setError('Unable to load your data. Please try logging in again.');
    }
    setLoading(false);
  }, [loadPortalData]);

  useEffect(() => {
    if (authLoading) return;
    if (!customerId) {
      setLoading(false);
      return;
    }
    reload();
  }, [customerId, authLoading, reload]);

  return { data, loading, error, reload };
}
