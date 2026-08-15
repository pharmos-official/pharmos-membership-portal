import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/types';

export function buildWhatsAppLink(settings: AppSettings, customMessage?: string): string {
  const number = settings.whatsapp_number?.replace(/\D/g, '') || '';
  const message = encodeURIComponent(customMessage ?? settings.whatsapp_message ?? '');
  return `https://wa.me/${number}?text=${message}`;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_app_settings');
    if (data && typeof data === 'object') {
      setSettings({ ...DEFAULT_APP_SETTINGS, ...(data as Record<string, string>) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { settings, loading, reload: load };
}

export function usePrimePlans(settings: AppSettings) {
  const basicPrice = settings.basic_plan_price || '99';
  const primePrice = settings.prime_plan_price || '199';
  return {
    basic: {
      id: 'basic' as const,
      label: settings.basic_plan_label || 'Basic Membership',
      price: basicPrice,
      priceLabel: `₹${basicPrice}/year`,
      features: [
        'Login & view your health records',
        'View BP, Blood Sugar, ECG records',
        'View monthly medicines & prescriptions',
        'View diagnosis & reports',
        'Records managed by PHARMOS staff',
      ],
    },
    prime: {
      id: 'prime' as const,
      label: settings.prime_plan_label || 'Pharmos Prime',
      price: primePrice,
      priceLabel: `₹${primePrice}/year`,
      features: [
        'Everything in Basic Membership',
        'Personal health document storage',
        'Upload prescriptions, reports, images & PDFs',
        'Organize documents into categories',
        'Add text notes',
        'Access your documents anytime',
      ],
    },
  };
}