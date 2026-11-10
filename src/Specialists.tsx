import { bySpecialistTable } from './metrics.ts';
import type { Dataset, Filters } from './types.ts';
import { fmt } from './format.ts';
import { Card } from './ui.tsx';

export default function Specialists({ ds, f }: { ds: Dataset; f: Filters }) {
  const rows = bySpecialistTable(ds, f);
  const max = Math.max(1, ...rows.map((r) => r.held));
  return (
    <Card title="Нагрузка по специалисткам" hint="Консультации, часы и клиенты за выбранный период. Клиентов в работе показаны на сегодня.">
      {rows.length === 0 ? (
        <p className="text-sm text-ink/60">Нет назначенных специалисток при выбранных фильтрах.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-ink/60">
                <th className="py-2 pr-3 font-medium">Специалистка</th>
                <th className="px-2 text-right font-medium">В работе</th>
                <th className="px-2 text-right font-medium">Клиентов за период</th>
                <th className="px-2 text-right font-medium">Консультаций</th>
                <th className="w-48 px-2 font-medium" />
                <th className="px-2 text-right font-medium">Часов</th>
                <th className="px-2 text-right font-medium">Отмен и неявок</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.specialist} className="border-b border-ink/5">
                  <td className="py-2 pr-3">{r.specialist}</td>
                  <td className="px-2 text-right">{fmt(r.inWork)}</td>
                  <td className="px-2 text-right">{fmt(r.clients)}</td>
                  <td className="px-2 text-right font-semibold">{fmt(r.held)}</td>
                  <td className="px-2">
                    <div className="h-3 rounded-full bg-brand" style={{ width: `${(r.held / max) * 100}%`, minWidth: 4 }} />
                  </td>
                  <td className="px-2 text-right">{fmt(r.hours, 1)}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.cancelled)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
