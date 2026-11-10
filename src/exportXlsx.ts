import writeExcelFile from 'write-excel-file/browser';
import type { Dataset, Filters } from './types.ts';
import { DIRECTION_LABEL, REGION_LABEL } from './types.ts';
import { closeReasons, monthly, bySpecialistTable, pct } from './metrics.ts';

const head = (...cols: string[]) => cols.map((value) => ({ value, fontWeight: 'bold' as const }));

export async function exportReport(ds: Dataset, f: Filters): Promise<Blob> {
  const rows = monthly(ds, f);
  const months = [
    head('Месяц', 'Обращений', 'взрослых', 'детрод', 'Передано в работу', 'взрослых', 'детрод', 'из регионов',
      'Доля детрода от переданных, %', 'В очереди на конец месяца', 'Консультаций проведено', 'из них детрод',
      'из регионов', 'Уникальных клиентов', 'Часов', 'Отмен и неявок', 'Среднее ожидание, дней'),
    ...rows.map((r) => [
      r.month, r.requests, r.requestsAdult, r.requestsDetrod, r.assigned, r.assignedAdult, r.assignedDetrod,
      r.assignedRegional, pct(r.assignedDetrod, r.assigned), r.queueEnd, r.held, r.heldDetrod, r.heldRegional,
      r.clients, r.hours, r.cancelled, r.avgWaitDays === null ? null : Math.round(r.avgWaitDays),
    ]),
  ];

  const specs = [
    head('Специалист', 'Клиентов в работе', 'Клиентов за период', 'Консультаций', 'Часов', 'Отмен и неявок'),
    ...bySpecialistTable(ds, f).map((s) => [s.specialist, s.inWork, s.clients, s.held, s.hours, s.cancelled]),
  ];

  const reasons = [
    head('Причина завершения', 'Случаев'),
    ...closeReasons(ds, f).map((x) => [x.reason, x.count]),
  ];

  const caseById = new Map(ds.cases.map((c) => [c.id, c]));
  const list = [
    head('Дата', 'Код случая', 'Специалист', 'Направление', 'Регион', 'Проект', 'Статус встречи', 'Часов'),
    ...ds.meetings
      .filter((m) => m.date >= `${f.from}-01` && m.date <= `${f.to}-31`)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((m) => {
        const c = caseById.get(m.caseId);
        return [
          m.date, m.caseId, c?.specialist ?? '', c ? DIRECTION_LABEL[c.direction] : '',
          c ? REGION_LABEL[c.regionGroup] : '', c?.project ?? '', m.status === 'held' ? 'состоялась' : 'не состоялась', m.hours,
        ];
      }),
  ];

  return writeExcelFile([
    { data: months, sheet: 'По месяцам' },
    { data: specs, sheet: 'По специалистам' },
    { data: reasons, sheet: 'Причины завершения' },
    { data: list, sheet: 'Консультации' },
  ]).toBlob();
}
