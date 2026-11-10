import { monthLabel } from './format.ts';

interface Series {
  name: string;
  color: string;
  values: number[];
}

const PAD = { l: 36, r: 8, t: 12, b: 26 };

function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/70">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

export function BarChart({ months, series, w = 640, h = 220 }: { months: string[]; series: Series[]; w?: number; h?: number }) {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const iw = w - PAD.l - PAD.r;
  const ih = h - PAD.t - PAD.b;
  const group = iw / months.length;
  const bw = Math.min(22, (group - 6) / series.length);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={series.map((s) => s.name).join(', ')}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="#1e1e1e" strokeOpacity={0.1} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#1e1e1e" fillOpacity={0.55} className="num">
            {t}
          </text>
        </g>
      ))}
      {months.map((m, i) => {
        const gx = PAD.l + i * group + (group - bw * series.length) / 2;
        return (
          <g key={m}>
            {series.map((s, j) => (
              <rect key={s.name} x={gx + j * bw} y={y(s.values[i])} width={bw - 2} height={PAD.t + ih - y(s.values[i])} rx={3} fill={s.color}>
                <title>{`${monthLabel(m)}: ${s.name} ${s.values[i]}`}</title>
              </rect>
            ))}
            <text x={PAD.l + i * group + group / 2} y={h - 8} textAnchor="middle" fontSize="11" fill="#1e1e1e" fillOpacity={0.6}>
              {monthLabel(m, true)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ months, series, w = 640, h = 220 }: { months: string[]; series: Series[]; w?: number; h?: number }) {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const iw = w - PAD.l - PAD.r;
  const ih = h - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (months.length === 1 ? iw / 2 : (i / (months.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={series.map((s) => s.name).join(', ')}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="#1e1e1e" strokeOpacity={0.1} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#1e1e1e" fillOpacity={0.55} className="num">
            {t}
          </text>
        </g>
      ))}
      {series.map((s) => (
        <g key={s.name}>
          <polyline fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          {s.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={s.color}>
              <title>{`${monthLabel(months[i])}: ${s.name} ${v}`}</title>
            </circle>
          ))}
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={h - 8} textAnchor="middle" fontSize="11" fill="#1e1e1e" fillOpacity={0.6}>
          {monthLabel(m, true)}
        </text>
      ))}
    </svg>
  );
}
