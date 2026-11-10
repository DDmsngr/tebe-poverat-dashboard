import { monthsBetween } from './metrics.ts';
import { monthLabel } from './format.ts';
import type { Filters as F } from './types.ts';
import { DIRECTION_LABEL, REGION_LABEL } from './types.ts';
import { Select } from './ui.tsx';

interface Props {
  value: F;
  onChange: (f: F) => void;
  range: { from: string; to: string };
  specialists: string[];
  projects: string[];
}

export default function Filters({ value, onChange, range, specialists, projects }: Props) {
  const months = monthsBetween(range.from, range.to).map((m) => ({ value: m, label: monthLabel(m) }));
  const set = (patch: Partial<F>) => {
    const next = { ...value, ...patch };
    if (next.from > next.to) {
      if (patch.from) next.to = next.from;
      else next.from = next.to;
    }
    onChange(next);
  };
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[20px] bg-white p-4">
      <Select label="С месяца" value={value.from} onChange={(v) => set({ from: v })} options={months} />
      <Select label="По месяц" value={value.to} onChange={(v) => set({ to: v })} options={months} />
      <Select
        label="Направление"
        value={value.direction}
        onChange={(v) => set({ direction: v })}
        options={[{ value: 'all', label: 'Все' }, ...(['adult', 'detrod'] as const).map((d) => ({ value: d, label: DIRECTION_LABEL[d] }))]}
      />
      <Select
        label="Специалистка"
        value={value.specialist}
        onChange={(v) => set({ specialist: v })}
        options={[{ value: 'all', label: 'Все' }, ...specialists.map((s) => ({ value: s, label: s }))]}
      />
      <Select
        label="Проект"
        value={value.project}
        onChange={(v) => set({ project: v })}
        options={[{ value: 'all', label: 'Все' }, ...projects.map((s) => ({ value: s, label: s }))]}
      />
      <Select
        label="Регион клиента"
        value={value.region}
        onChange={(v) => set({ region: v })}
        options={[{ value: 'all', label: 'Все' }, ...(['capitals', 'regions'] as const).map((r) => ({ value: r, label: REGION_LABEL[r] }))]}
      />
    </div>
  );
}
