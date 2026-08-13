import { useEffect, useState } from 'react';
import { Users, Pill, HeartPulse, CreditCard, Download, TrendingUp, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { membershipStatus, formatDate, downloadFile } from '@/lib/helpers';

interface ReportData {
  totalCustomers: number;
  newCustomers: number;
  activeMembers: number;
  expiredMembers: number;
  regularCustomers: number;
  inactiveCustomers: number;
  monthlyPurchases: number;
  regularMedCount: number;
  customersDueMedicine: number;
  monthlyBp: number;
  monthlySugar: number;
  monthlyEcg: number;
  expiringSoon: number;
}

export function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dueForMedicine, setDueForMedicine] = useState<{ name: string; membership_id: string; next_due: string }[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [customers, memberships, medPurchases, bpMonth, sugarMonth, ecgMonth] = await Promise.all([
      supabase.from('customers').select('id, created_at'),
      supabase.from('memberships').select('id, customer_id, expiry_date'),
      supabase.from('medicine_purchases').select('customer_id, purchase_date, next_due_date'),
      supabase.from('bp_records').select('id, checkup_date').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('sugar_records').select('id, checkup_date').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
      supabase.from('ecg_records').select('id, checkup_date').gte('checkup_date', monthStart).lte('checkup_date', monthEnd),
    ]);

    const allCustomers = customers.data ?? [];
    const allMemberships = memberships.data ?? [];
    const allPurchases = medPurchases.data ?? [];

    // New customers this month
    const newCustomers = allCustomers.filter(c => new Date(c.created_at) >= new Date(monthStart)).length;

    // Active/Expired
    let active = 0, expired = 0, expiring = 0;
    for (const m of allMemberships) {
      const st = membershipStatus(m.expiry_date);
      if (st === 'Active') {
        active++;
        const dleft = Math.ceil((new Date(m.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (dleft <= 30) expiring++;
      } else expired++;
    }

    // Regular / Inactive
    const purchByCust = new Map<string, Set<string>>();
    const lastPurchByCust = new Map<string, string>();
    for (const p of allPurchases) {
      const d = new Date(p.purchase_date);
      if (d >= sixMonthsAgo) {
        if (!purchByCust.has(p.customer_id)) purchByCust.set(p.customer_id, new Set());
        purchByCust.get(p.customer_id)!.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
      const existing = lastPurchByCust.get(p.customer_id);
      if (!existing || p.purchase_date > existing) lastPurchByCust.set(p.customer_id, p.purchase_date);
    }

    let regular = 0, inactive = 0;
    for (const months of purchByCust.values()) {
      if (months.size >= 4) regular++;
    }
    for (const [_, lastDate] of lastPurchByCust) {
      if (new Date(lastDate) < ninetyDaysAgo) inactive++;
    }

    // Due for medicine
    const dueList: { name: string; membership_id: string; next_due: string }[] = [];
    const dueSet = new Map<string, string>();
    for (const p of allPurchases) {
      if (p.next_due_date && new Date(p.next_due_date) <= now) {
        const existing = dueSet.get(p.customer_id);
        if (!existing || p.next_due_date > existing) dueSet.set(p.customer_id, p.next_due_date);
      }
    }

    // Get names for due customers
    if (dueSet.size > 0) {
      const custIds = Array.from(dueSet.keys());
      const { data: dueCusts } = await supabase
        .from('customers')
        .select('id, name, memberships(membership_id)')
        .in('id', custIds);
      for (const c of dueCusts ?? []) {
        dueList.push({
          name: c.name,
          membership_id: c.memberships?.[0]?.membership_id ?? '—',
          next_due: dueSet.get(c.id)!,
        });
      }
      dueList.sort((a, b) => a.next_due.localeCompare(b.next_due));
    }

    // Monthly purchases
    const monthlyPurchases = allPurchases.filter(p => {
      const d = new Date(p.purchase_date);
      return d >= new Date(monthStart) && d <= new Date(monthEnd);
    }).length;

    setData({
      totalCustomers: allCustomers.length,
      newCustomers,
      activeMembers: active,
      expiredMembers: expired,
      regularCustomers: regular,
      inactiveCustomers: inactive,
      monthlyPurchases,
      regularMedCount: regular,
      customersDueMedicine: dueSet.size,
      monthlyBp: bpMonth.data?.length ?? 0,
      monthlySugar: sugarMonth.data?.length ?? 0,
      monthlyEcg: ecgMonth.data?.length ?? 0,
      expiringSoon: expiring,
    });
    setDueForMedicine(dueList);
    setLoading(false);
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Report', 'Value'],
      ['Total Customers', data.totalCustomers],
      ['New Customers (This Month)', data.newCustomers],
      ['Active Members', data.activeMembers],
      ['Expired Members', data.expiredMembers],
      ['Regular Customers', data.regularCustomers],
      ['Inactive Customers', data.inactiveCustomers],
      ['Monthly Medicine Purchases', data.monthlyPurchases],
      ['Customers Due for Medicine', data.customersDueMedicine],
      ['Monthly BP Checkups', data.monthlyBp],
      ['Monthly Sugar Checkups', data.monthlySugar],
      ['Monthly ECG Checkups', data.monthlyEcg],
      ['Memberships Expiring Soon', data.expiringSoon],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    downloadFile(csv, `pharmos-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate-800">Reports</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      </div>
    );
  }

  const sections: { title: string; icon: typeof Users; items: { label: string; value: number }[] }[] = [
    {
      title: 'Customer Reports',
      icon: Users,
      items: [
        { label: 'Total Customers', value: data!.totalCustomers },
        { label: 'New Customers (This Month)', value: data!.newCustomers },
        { label: 'Active Members', value: data!.activeMembers },
        { label: 'Expired Members', value: data!.expiredMembers },
        { label: 'Regular Customers', value: data!.regularCustomers },
        { label: 'Inactive Customers', value: data!.inactiveCustomers },
      ],
    },
    {
      title: 'Medicine Reports',
      icon: Pill,
      items: [
        { label: 'Monthly Medicine Purchases', value: data!.monthlyPurchases },
        { label: 'Regular Medicine Customers', value: data!.regularMedCount },
        { label: 'Customers Due for Medicine', value: data!.customersDueMedicine },
      ],
    },
    {
      title: 'Health Reports',
      icon: HeartPulse,
      items: [
        { label: 'Monthly BP Checkups', value: data!.monthlyBp },
        { label: 'Monthly Sugar Checkups', value: data!.monthlySugar },
        { label: 'Monthly ECG Checkups', value: data!.monthlyEcg },
      ],
    },
    {
      title: 'Membership Reports',
      icon: CreditCard,
      items: [
        { label: 'Active Memberships', value: data!.activeMembers },
        { label: 'Expired Memberships', value: data!.expiredMembers },
        { label: 'Expiring Soon (30 days)', value: data!.expiringSoon },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Reports</h1>
          <p className="mt-0.5 text-sm text-slate-500">PHARMOS system summary — {formatDate(new Date().toISOString())}</p>
        </div>
        <button onClick={exportCsv} className="btn-outline">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="card p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pharmos-50">
                  <Icon size={18} className="text-pharmos-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
              </div>
              <div className="mt-4 space-y-2">
                {section.items.map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="font-display text-lg font-bold text-slate-800">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customers due for medicine */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <TrendingUp size={20} className="text-gold-600" />
          <h3 className="text-sm font-bold text-slate-800">Customers Due for Medicine Follow-up</h3>
          <span className="ml-auto badge-gold">{dueForMedicine.length} customers</span>
        </div>
        {dueForMedicine.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No customers are currently due for medicine.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {dueForMedicine.slice(0, 20).map((c, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-50 text-xs font-bold text-gold-700">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.membership_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Expected</p>
                  <p className="text-sm font-semibold text-gold-600">{formatDate(c.next_due)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
