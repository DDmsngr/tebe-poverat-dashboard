import { useMemo, useState } from 'react';
import { BarChart3, Database, HelpCircle, Users } from 'lucide-react';
import type { Dataset, Filters as F } from './types.ts';
import { dataRange, facets, ymOf } from './metrics.ts';
import { loadDataset, saveDataset } from './store.ts';
import Filters from './Filters.tsx';
import Overview from './Overview.tsx';
import Specialists from './Specialists.tsx';
import DataPanel from './DataPanel.tsx';
import Help from './Help.tsx';

type Tab = 'overview' | 'specialists' | 'data' | 'help';

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'specialists', label: 'Специалистки', icon: Users },
  { id: 'data', label: 'Данные', icon: Database },
  { id: 'help', label: 'Как считаем', icon: HelpCircle },
];

function defaultFilters(ds: Dataset): F {
  const r = dataRange(ds);
  const from = r.from < '2026-01' && ds.source === 'demo' ? '2026-01' : r.from;
  return { from, to: r.to, direction: 'all', specialist: 'all', project: 'all', region: 'all' };
}

export default function App() {
  const [ds, setDs] = useState<Dataset>(() => loadDataset());
  const [f, setF] = useState<F>(() => defaultFilters(ds));
  const [tab, setTab] = useState<Tab>('overview');

  const range = useMemo(() => {
    const r = dataRange(ds);
    return { from: r.from, to: r.to > `${ymOf(r.from).slice(0, 4)}-12` ? r.to : `${ymOf(r.from).slice(0, 4)}-12` };
  }, [ds]);
  const fac = useMemo(() => facets(ds), [ds]);

  function setData(next: Dataset) {
    saveDataset(next);
    setDs(next);
    setF(defaultFilters(next));
    setTab('overview');
  }

  return (
    <div className="min-h-screen">
      <header className="bg-night text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="text-xl font-semibold tracking-tight">
              Тебе <span className="text-rose">поверят</span>
            </div>
            <div className="text-sm text-white/65">Учёт психологической помощи</div>
          </div>
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/80">
            Прототип. {ds.source === 'demo' ? 'Данные вымышлены' : 'Данные из загруженного файла'}
          </span>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-t-2xl px-4 py-2.5 text-sm transition ${
                tab === id ? 'bg-cream font-semibold text-night' : 'text-white/75 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-5 py-6">
        {(tab === 'overview' || tab === 'specialists') && (
          <Filters value={f} onChange={setF} range={range} specialists={fac.specialists} projects={fac.projects} />
        )}
        {tab === 'overview' && <Overview ds={ds} f={f} />}
        {tab === 'specialists' && <Specialists ds={ds} f={f} />}
        {tab === 'data' && <DataPanel ds={ds} f={f} onData={setData} />}
        {tab === 'help' && <Help />}
      </main>

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-ink/50">
        Прототип для согласования показателей. Реальных данных клиентов здесь нет.
      </footer>
    </div>
  );
}
