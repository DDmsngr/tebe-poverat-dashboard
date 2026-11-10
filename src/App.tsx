import { useMemo, useState } from 'react';
import { BarChart3, ClipboardList, Database, HelpCircle, Users } from 'lucide-react';
import type { Dataset, Filters as F } from './types.ts';
import { dataRange, facets, ymOf } from './metrics.ts';
import { loadDataset, saveDataset } from './store.ts';
import type { Role } from './crm.ts';
import Filters from './Filters.tsx';
import Overview from './Overview.tsx';
import Specialists from './Specialists.tsx';
import Cases from './Cases.tsx';
import DataPanel from './DataPanel.tsx';
import Help from './Help.tsx';
import Onboarding, { onboardingSeen } from './Onboarding.tsx';

type Tab = 'overview' | 'cases' | 'specialists' | 'data' | 'help';

const TABS: { id: Tab; label: string; icon: typeof BarChart3; adminOnly?: boolean }[] = [
  { id: 'cases', label: 'Случаи', icon: ClipboardList },
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'specialists', label: 'Специалисты', icon: Users, adminOnly: true },
  { id: 'data', label: 'Данные', icon: Database, adminOnly: true },
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
  const [tab, setTab] = useState<Tab>('cases');
  const [role, setRole] = useState<Role>({ kind: 'admin' });
  const [tour, setTour] = useState(() => !onboardingSeen());

  const range = useMemo(() => {
    const r = dataRange(ds);
    const dec = `${ymOf(r.from).slice(0, 4)}-12`;
    return { from: r.from, to: r.to > dec ? r.to : dec };
  }, [ds]);
  const fac = useMemo(() => facets(ds), [ds]);

  // Психолог видит показатели только по своим случаям.
  const effective: F = role.kind === 'specialist' ? { ...f, specialist: role.name } : f;
  const visibleTabs = TABS.filter((t) => !t.adminOnly || role.kind === 'admin');

  function setData(next: Dataset) {
    saveDataset(next);
    setDs(next);
    setF(defaultFilters(next));
    setTab('cases');
    setRole({ kind: 'admin' });
  }

  // Правка из карточки: данные меняются, экран и фильтры остаются.
  function edit(next: Dataset) {
    saveDataset(next);
    setDs(next);
  }

  // Экскурсия показывает кнопки администратора, поэтому начинается с его роли и страницы случаев.
  function openTour() {
    setRole({ kind: 'admin' });
    setTab('cases');
    setTour(true);
  }

  function changeRole(value: string) {
    const next: Role = value === 'admin' ? { kind: 'admin' } : { kind: 'specialist', name: value };
    setRole(next);
    if (next.kind === 'specialist' && (tab === 'specialists' || tab === 'data')) setTab('cases');
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
          <div className="flex flex-wrap items-center gap-3">
            <label data-tour="role" className="flex items-center gap-2 rounded-full text-xs text-white/70">
              Вы вошли как
              <select
                value={role.kind === 'admin' ? 'admin' : role.name}
                onChange={(e) => changeRole(e.target.value)}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm text-white outline-none"
              >
                <option value="admin" className="text-ink">Администратор</option>
                {fac.specialists.map((s) => (
                  <option key={s} value={s} className="text-ink">Психолог: {s}</option>
                ))}
              </select>
            </label>
            <button
              data-tour="tour-btn"
              onClick={openTour}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10"
            >
              <HelpCircle size={14} /> Как пользоваться
            </button>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/80">
              Прототип. {ds.source === 'demo' ? 'Данные вымышлены' : 'Данные из загруженного файла'}
              {ds.edited ? ', есть правки' : ''}
            </span>
          </div>
        </div>
        <nav data-tour="tabs" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-tour={`tab-${id}`}
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
          <Filters value={effective} onChange={setF} range={range} specialists={fac.specialists} projects={fac.projects} lockSpecialist={role.kind === 'specialist'} />
        )}
        {tab === 'overview' && <Overview ds={ds} f={effective} />}
        {tab === 'cases' && <Cases ds={ds} role={role} onChange={edit} />}
        {tab === 'specialists' && <Specialists ds={ds} f={effective} />}
        {tab === 'data' && <DataPanel ds={ds} f={effective} onData={setData} />}
        {tab === 'help' && <Help />}
      </main>

      {tour && <Onboarding onClose={() => setTour(false)} />}

      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-ink/50">
        Прототип для согласования показателей. Реальных данных клиентов здесь нет. Изменения сохраняются в этом браузере, в рабочей версии они пойдут в Битрикс24.
      </footer>
    </div>
  );
}
