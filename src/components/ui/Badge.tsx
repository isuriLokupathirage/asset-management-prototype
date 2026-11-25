import React from 'react';
import { twMerge } from 'tailwind-merge';
import type { Tone } from '../../services/domain';

export function Badge({ children, className }: {children: React.ReactNode;className?: string;}) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        'bg-slate-50 text-muted ring-line',
        className
      )}>
      {children}
    </span>);

}

export const toneStyles: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200'
};

export function StatusBadge({ tone, children }: {tone: Tone;children: React.ReactNode;}) {
  return (
    <Badge className={toneStyles[tone]}>
      <span className={twMerge('h-1.5 w-1.5 rounded-full bg-current opacity-70')} />
      {children}
    </Badge>);

}
