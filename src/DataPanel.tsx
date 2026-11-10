import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, RotateCcw, Plug } from 'lucide-react';
import readExcelFile from 'read-excel-file/browser';
import type { Dataset, Filters } from './types.ts';
import { parseConsultations, type RawSheet } from './importOld.ts';
import { exportReport } from './exportXlsx.ts';
import { makeDemo } from './demo.ts';
import { Button, Card } from './ui.tsx';

interface Props {
  ds: Dataset;
  f: Filters;
  onData: (ds: Dataset) => void;
}

const SOURCE_LABEL = { demo: 'Демо-данные', excel: 'Загружено из таблицы', crm: 'Битрикс24' } as const;

export default function DataPanel({ ds, f, onData }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState(2026);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const sheets = (await readExcelFile(file)) as RawSheet[];
      onData(parseConsultations(sheets, year));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось прочитать файл.');
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    const blob = await exportReport(ds, f);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otchet_${f.from}_${f.to}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Данные в панели" hint="Что сейчас показано на экранах.">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Источник</dt>
            <dd className="font-medium">{SOURCE_LABEL[ds.source]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Описание</dt>
            <dd className="text-right">{ds.label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">Случаев и встреч</dt>
            <dd className="num">
              {ds.cases.length} и {ds.meetings.length}
            </dd>
          </div>
        </dl>
        {ds.warnings.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-2xl bg-cream p-3 text-xs text-ink/75">
            {ds.warnings.slice(0, 6).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {ds.warnings.length > 6 && <li>…и ещё {ds.warnings.length - 6}</li>}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={download}>
            <Download size={16} /> Скачать отчёт (.xlsx)
          </Button>
          {ds.source !== 'demo' && (
            <Button variant="ghost" onClick={() => onData(makeDemo())}>
              <RotateCcw size={16} /> Вернуть демо-данные
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-ink/55">
          В отчёт попадает период и фильтры, выбранные сверху: сводка по месяцам, специалисты, причины завершения и список консультаций.
        </p>
      </Card>

      <Card title="Загрузить старую таблицу" hint="Файл «Консультации» в текущем виде: вкладка на каждого специалиста, строка клиента, колонки дней.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink/60">
            Год таблицы
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-full border border-brand/25 bg-white px-3 py-2 text-sm font-normal text-ink"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <input
            ref={input}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = '';
            }}
          />
          <Button onClick={() => input.current?.click()} disabled={busy}>
            <FileSpreadsheet size={16} /> {busy ? 'Читаю файл…' : 'Выбрать файл .xlsx'}
          </Button>
        </div>
        {error && <p className="mt-3 rounded-2xl bg-blush p-3 text-sm text-night">{error}</p>}
        <p className="mt-4 text-sm text-ink/70">
          Файл читается прямо в браузере и никуда не отправляется. Данные остаются в этом браузере, пока вы не вернёте демо-данные или не очистите сайт.
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Из этой таблицы получаются консультации, часы и клиенты. Обращения, очередь и причины завершения в ней не записаны, их даст «База обращений» или CRM.
        </p>
      </Card>

      <Card title="Подключение к Битрикс24" hint="Новые данные поступают из CRM, старая таблица остаётся как история." className="lg:col-span-2">
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-[16rem] flex-1 text-sm text-ink/75">
            <p>
              Новые обращения, назначения специалистов и встречи вносятся в карточках на вкладке «Случаи» и сразу записываются в Битрикс24. Там данные
              остаются единственным хранилищем, а панель читает их оттуда и показывает показатели. Старая таблица загружается один раз, и в отчётах
              история и новые данные идут одним рядом.
            </p>
            <p className="mt-2">
              Для подключения нужен небольшой промежуточный сервис, который читает CRM и передаёт в панель только коды и числа, а имена, почты и тексты обращений остаются в Битрикс24. В обратную сторону он принимает изменения из карточек. Он
              настраивается на следующем этапе, после проверки тарифа и доступа к API.
            </p>
          </div>
          <Button variant="ghost" disabled title="Подключение настраивается на следующем этапе">
            <Plug size={16} /> Подключить Битрикс24
          </Button>
        </div>
      </Card>
    </div>
  );
}
