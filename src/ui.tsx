import type { ReactNode } from 'react';

export function Card({ title, hint, children, className = '' }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[20px] bg-white p-5 shadow-[0_1px_0_rgba(25,35,46,0.06)] ${className}`}>
      {title && (
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-night">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-ink/60">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone = 'brand' }: { label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'teal' | 'sand' }) {
  const bg = { brand: 'bg-sky', rose: 'bg-blush', teal: 'bg-[#dcebe9]', sand: 'bg-[#fbeedd]' }[tone];
  return (
    <div className={`rounded-[20px] ${bg} p-4`}>
      <div className="text-sm text-ink/70">{label}</div>
      <div className="num mt-1 text-3xl font-semibold text-night">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink/60">{sub}</div>}
    </div>
  );
}

export function Select<T extends string>({
  label, value, onChange, options, disabled,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; disabled?: boolean }) {
  return (
    <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium text-ink/60">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="disabled:opacity-60 rounded-full border border-brand/25 bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Button({
  children, onClick, variant = 'primary', disabled, title,
}: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; title?: string }) {
  const style =
    variant === 'primary'
      ? 'bg-brand text-white hover:bg-brand-dark'
      : 'border border-brand/30 text-brand hover:bg-brand/5';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${style}`}
    >
      {children}
    </button>
  );
}
