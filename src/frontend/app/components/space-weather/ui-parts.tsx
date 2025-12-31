import type React from 'react';
import { cn } from './utils';

type StatChipProps = {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
};

export function StatChip({ label, value, sub, tone }: StatChipProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] md:text-[11px] text-zinc-400">{label}</div>
      <div className={cn('text-sm md:text-base font-semibold tracking-wide tabular-nums', tone)}>
        {value}
      </div>
      {sub ? <div className="text-[10px] md:text-[11px] text-zinc-500 truncate">{sub}</div> : null}
    </div>
  );
}

type CardProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
};

export function Card({ title, subtitle, right, children }: CardProps) {
  return (
    <section className="rounded-xl md:rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-2 px-3 pt-3 md:px-5 md:pt-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] md:text-xs text-zinc-400 truncate">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0">{right}</div>
      </div>
      <div className="px-1 pb-2 pt-2 md:px-2 md:pb-4 md:pt-3">{children}</div>
    </section>
  );
}
