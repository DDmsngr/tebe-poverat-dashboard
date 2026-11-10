import { closeReasons, monthly, periodSummary, pct } from './metrics.ts';
import type { Dataset, Filters } from './types.ts';
import { fmt, fmtPct, monthLabel } from './format.ts';
import { BarChart, LineChart, Legend } from './charts.tsx';
import { Card, Kpi } from './ui.tsx';

export default function Overview({ ds, f }: { ds: Dataset; f: Filters }) {
  const rows = monthly(ds, f);
  const total = periodSummary(ds, f);
  const months = rows.map((r) => r.month);
  const reasons = closeReasons(ds, f);
  const bars = [
    { name: 'Новые обращения', color: '#6063a6', values: rows.map((r) => r.requests) },
    { name: 'Передано специалисткам', color: '#d98b99', values: rows.map((r) => r.assigned) },
  ];
  const line = [{ name: 'В очереди на конец месяца', color: '#1c5358', values: rows.map((r) => r.queueEnd) }];
  const held = [{ name: 'Консультаций проведено', color: '#6063a6', values: rows.map((r) => r.held) }];

  return (
    <div className="space-y-5">
      {ds.source === 'excel' && (
        <div className="rounded-[20px] border border-rose/40 bg-blush p-4 text-sm text-night">
          Загружена только таблица «Консультации». Консультации, часы и клиенты ниже посчитаны по ней, а показатели обращений и очереди пока не отражают
          реальность: они появятся после загрузки «Базы обращений» или подключения CRM.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Новые обращения" value={fmt(total.requests)} sub={`взрослых ${fmt(total.requestsAdult)}, детрод ${fmt(total.requestsDetrod)}`} />
        <Kpi tone="rose" label="Передано специалисткам" value={fmt(total.assigned)} sub={`из регионов ${fmt(total.assignedRegional)}`} />
        <Kpi tone="teal" label="В очереди на конец периода" value={fmt(total.queueEnd)} sub="специалистка ещё не назначена" />
        <Kpi label="Консультаций проведено" value={fmt(total.held)} sub={`из них детрод ${fmt(total.heldDetrod)}, часов ${fmt(total.hours, 1)}`} />
        <Kpi tone="rose" label="Уникальных клиентов" value={fmt(total.clients)} sub="каждый человек считается один раз" />
        <Kpi tone="sand" label="Среднее ожидание" value={total.avgWaitDays === null ? '—' : `${fmt(total.avgWaitDays)} дн.`} sub="от обращения до назначения" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Обращения и передача в работу" hint="По месяцам. Передано может быть больше новых обращений: разбирается и очередь прошлых месяцев.">
          <Legend series={bars} />
          <BarChart months={months} series={bars} />
        </Card>
        <Card title="Очередь на конец месяца" hint="Принятые обращения, по которым специалистка ещё не назначена.">
          <Legend series={line} />
          <LineChart months={months} series={line} />
        </Card>
      </div>

      <Card title="Консультации по месяцам" hint="Состоявшиеся встречи. Отменённые не учитываются.">
        <BarChart months={months} series={held} w={1280} h={260} />
      </Card>

      <Card title="Сводная таблица по месяцам" hint="Те же строки, что сейчас считаются вручную, плюс доли и ожидание.">
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-ink/60">
                <th className="py-2 pr-3 font-medium">Месяц</th>
                <th className="px-2 text-right font-medium">Обращений</th>
                <th className="px-2 text-right font-medium">взрослых</th>
                <th className="px-2 text-right font-medium">детрод</th>
                <th className="px-2 text-right font-medium">Передано</th>
                <th className="px-2 text-right font-medium">взрослых</th>
                <th className="px-2 text-right font-medium">детрод</th>
                <th className="px-2 text-right font-medium">доля детрода</th>
                <th className="px-2 text-right font-medium">из регионов</th>
                <th className="px-2 text-right font-medium">В очереди</th>
                <th className="px-2 text-right font-medium">Консультаций</th>
                <th className="px-2 text-right font-medium">из них детрод</th>
                <th className="px-2 text-right font-medium">Клиентов</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-ink/5">
                  <td className="py-2 pr-3 capitalize">{monthLabel(r.month)}</td>
                  <td className="px-2 text-right">{fmt(r.requests)}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.requestsAdult)}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.requestsDetrod)}</td>
                  <td className="px-2 text-right">{fmt(r.assigned)}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.assignedAdult)}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.assignedDetrod)}</td>
                  <td className="px-2 text-right text-ink/60">{fmtPct(pct(r.assignedDetrod, r.assigned))}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.assignedRegional)}</td>
                  <td className="px-2 text-right">{fmt(r.queueEnd)}</td>
                  <td className="px-2 text-right">{fmt(r.held)}</td>
                  <td className="px-2 text-right text-ink/60">{fmt(r.heldDetrod)}</td>
                  <td className="px-2 text-right">{fmt(r.clients)}</td>
                </tr>
              ))}
              <tr className="bg-sky/60 font-semibold">
                <td className="rounded-l-xl py-2 pl-2 pr-3">За период</td>
                <td className="px-2 text-right">{fmt(total.requests)}</td>
                <td className="px-2 text-right">{fmt(total.requestsAdult)}</td>
                <td className="px-2 text-right">{fmt(total.requestsDetrod)}</td>
                <td className="px-2 text-right">{fmt(total.assigned)}</td>
                <td className="px-2 text-right">{fmt(total.assignedAdult)}</td>
                <td className="px-2 text-right">{fmt(total.assignedDetrod)}</td>
                <td className="px-2 text-right">{fmtPct(pct(total.assignedDetrod, total.assigned))}</td>
                <td className="px-2 text-right">{fmt(total.assignedRegional)}</td>
                <td className="px-2 text-right">{fmt(total.queueEnd)}</td>
                <td className="px-2 text-right">{fmt(total.held)}</td>
                <td className="px-2 text-right">{fmt(total.heldDetrod)}</td>
                <td className="rounded-r-xl px-2 text-right">{fmt(total.clients)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/55">
          В строке «За период» очередь показана на конец периода, а число клиентов посчитано по всему периоду: человек, который был в двух месяцах, учтён один раз.
        </p>
      </Card>

      <Card title="Как завершилась работа" hint="Причину в CRM будет выбирать психолог из списка.">
        {reasons.length === 0 ? (
          <p className="text-sm text-ink/60">За выбранный период завершённых случаев нет или причина не указана.</p>
        ) : (
          <ul className="space-y-2">
            {reasons.map((x) => (
              <li key={x.reason} className="flex items-center gap-3 text-sm">
                <span className="w-52 shrink-0">{x.reason}</span>
                <span className="h-3 rounded-full bg-brand" style={{ width: `${(x.count / reasons[0].count) * 55}%`, minWidth: 8 }} />
                <span className="num text-ink/70">{x.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
