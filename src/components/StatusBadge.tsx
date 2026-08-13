import { type ReactNode } from 'react';

type Tone = 'green' | 'red' | 'gold' | 'blue' | 'slate';

const classes: Record<Tone, string> = {
  green: 'badge-green',
  red: 'badge-red',
  gold: 'badge-gold',
  blue: 'badge-blue',
  slate: 'badge-slate',
};

export function StatusBadge({ tone, children, icon }: { tone: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={classes[tone]}>
      {icon}
      {children}
    </span>
  );
}
