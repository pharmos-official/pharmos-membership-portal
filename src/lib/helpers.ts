import { supabase } from './supabase';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(time: string | null): string {
  if (!time) return '';
  // time may come as "14:30:00"
  const parts = time.split(':');
  if (parts.length < 2) return time;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function membershipStatus(expiry: string | null): 'Active' | 'Expired' {
  if (!expiry) return 'Expired';
  return new Date(expiry) >= new Date(new Date().toDateString()) ? 'Active' : 'Expired';
}

export function daysUntilExpiry(expiry: string | null): number {
  if (!expiry) return 0;
  const diff = new Date(expiry).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  // If start date is Feb 29, adjust to Feb 28 of non-leap year
  if (d.getMonth() === 1 && d.getDate() === 29 && !isLeapYear(d.getFullYear())) {
    d.setDate(28);
  }
  return d;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calcExpiry(startDate: string): string {
  const start = new Date(startDate);
  const exp = addYears(start, 1);
  // Membership is 1 year; e.g. start 01/08/2026 → expiry 31/07/2027
  exp.setDate(exp.getDate() - 1);
  return toISODate(exp);
}

export function calcNextDue(purchaseDate: string, days: number): string {
  return toISODate(addDays(new Date(purchaseDate), days));
}

/**
 * Generate the next membership ID in PHM000001 format using a Postgres sequence.
 */
export async function generateMembershipId(): Promise<string> {
  const { data, error } = await supabase.rpc('next_membership_id');
  if (error || data === null || data === undefined) {
    // Fallback: read max existing
    const { data: existing } = await supabase
      .from('memberships')
      .select('membership_id')
      .order('membership_id', { ascending: false })
      .limit(1);
    const nextNum = existing && existing.length > 0
      ? parseInt(existing[0].membership_id.replace(/\D/g, ''), 10) + 1
      : 1;
    return formatMembershipId(nextNum);
  }
  return formatMembershipId(data as number);
}

function formatMembershipId(n: number): string {
  return 'PHM' + String(n).padStart(6, '0');
}

export function customerStatus(
  membership: { expiry_date: string } | null,
  purchases: { purchase_date: string }[],
): { label: string; tone: 'green' | 'gold' | 'blue' | 'red' | 'slate' } {
  if (!membership || membershipStatus(membership.expiry_date) === 'Expired') {
    return { label: 'Membership Expired', tone: 'red' };
  }
  if (purchases.length === 0) {
    return { label: 'New Customer', tone: 'blue' };
  }
  // Check last 6 months activity
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const last6 = purchases.filter(p => new Date(p.purchase_date) >= sixMonthsAgo);
  const monthsActive = new Set(
    last6.map(p => {
      const d = new Date(p.purchase_date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }),
  ).size;

  if (monthsActive >= 4) return { label: 'Regular Customer', tone: 'green' };
  if (monthsActive >= 2) return { label: 'Monthly Customer', tone: 'gold' };

  // If last purchase older than 90 days → inactive
  const lastPurchase = purchases[0]?.purchase_date;
  if (lastPurchase) {
    const daysSince = Math.ceil(
      (now.getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince > 90) return { label: 'Inactive Customer', tone: 'slate' };
  }
  return { label: 'New Customer', tone: 'blue' };
}

export function consistencyPercent(purchases: { purchase_date: string }[], months = 6): number {
  if (purchases.length === 0) return 0;
  const now = new Date();
  const activeMonths = new Set<string>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    activeMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  const purchasedMonths = new Set(
    purchases
      .filter(p => {
        const d = new Date(p.purchase_date);
        return activeMonths.has(`${d.getFullYear()}-${d.getMonth()}`);
      })
      .map(p => {
        const d = new Date(p.purchase_date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      }),
  );
  return Math.round((purchasedMonths.size / months) * 100);
}

export function lastPurchaseDate(purchases: { purchase_date: string }[]): string | null {
  if (purchases.length === 0) return null;
  return purchases[0].purchase_date;
}

export function nextExpectedPurchase(purchases: { purchase_date: string; next_due_date: string | null }[]): string | null {
  if (purchases.length === 0) return null;
  // Use the latest next_due_date
  const withDue = purchases.filter(p => p.next_due_date);
  if (withDue.length > 0) return withDue[0].next_due_date;
  return null;
}

export function lastCheckupDate(
  bp: { checkup_date: string }[],
  sugar: { checkup_date: string }[],
  ecg: { checkup_date: string }[],
): string | null {
  const all = [...bp, ...sugar, ...ecg].map(r => r.checkup_date).sort((a, b) => b.localeCompare(a));
  return all[0] ?? null;
}

export function monthKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function checkupThisMonth(records: { checkup_date: string }[], year: number, month: number): boolean {
  return records.some(r => {
    const d = new Date(r.checkup_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function groupByMonth<T extends { checkup_date?: string; purchase_date?: string }>(
  records: T[],
  dateField: 'checkup_date' | 'purchase_date' = 'checkup_date',
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of records) {
    const d = r[dateField];
    if (!d) continue;
    const key = monthKey(d);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export function downloadFile(content: string, filename: string, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
