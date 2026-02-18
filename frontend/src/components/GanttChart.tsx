import { useMemo } from 'react';
import type { Activity, Phase } from '../types';
import { addDays, differenceInDays, parseISO, format, min, max } from 'date-fns';

interface Props {
  activities: Activity[];
  phases: Phase[];
}

const PHASE_COLORS: Record<number, string> = {
  0: '#3b82f6',
  1: '#8b5cf6',
  2: '#f59e0b',
  3: '#10b981',
  4: '#ef4444',
};

const STATUS_FILL: Record<string, string> = {
  completed:   '#10b981',
  in_progress: '#3b82f6',
  pending:     '#94a3b8',
};

export default function GanttChart({ activities, phases }: Props) {
  const today = new Date();

  const { minDate, maxDate, phaseMap } = useMemo(() => {
    const phaseMap = new Map(phases.map(p => [p.id, p]));
    if (activities.length === 0) {
      return {
        minDate: today,
        maxDate: addDays(today, 90),
        phaseMap,
      };
    }
    const starts = activities.map(a => parseISO(a.start_date));
    const ends   = activities.map(a => parseISO(a.end_date));
    return {
      minDate: min(starts),
      maxDate: max(ends),
      phaseMap,
    };
  }, [activities, phases]);

  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 7, 30);

  // Build month headers
  const months: { label: string; start: number; width: number }[] = [];
  let cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor <= maxDate) {
    const monthStart = Math.max(0, differenceInDays(cursor, minDate));
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const monthEnd = Math.min(totalDays, differenceInDays(nextMonth, minDate));
    months.push({
      label: format(cursor, 'MMM yyyy'),
      start: monthStart,
      width: monthEnd - monthStart,
    });
    cursor = nextMonth;
  }

  const todayOffset = Math.max(0, differenceInDays(today, minDate));
  const cellWidth = 28; // px per day
  const rowH = 38;
  const labelW = 220;

  // Group activities by phase
  const grouped: { phase: Phase | null; acts: Activity[] }[] = [];
  const phaseGroups = new Map<number | undefined, Activity[]>();
  activities.forEach(a => {
    const key = a.phase_id;
    if (!phaseGroups.has(key)) phaseGroups.set(key, []);
    phaseGroups.get(key)!.push(a);
  });

  // Ordered by phases first
  phases.forEach(ph => {
    const acts = phaseGroups.get(ph.id) || [];
    grouped.push({ phase: ph, acts });
  });
  const unphased = phaseGroups.get(undefined) || [];
  if (unphased.length > 0) grouped.push({ phase: null, acts: unphased });

  const totalWidth = totalDays * cellWidth + labelW;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <div style={{ minWidth: totalWidth }}>
        {/* Month header */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div style={{ width: labelW, minWidth: labelW }} className="px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200 flex-shrink-0">
            Activity
          </div>
          <div className="flex-1 relative" style={{ height: 36 }}>
            {months.map(m => (
              <div
                key={m.label}
                className="absolute top-0 bottom-0 border-r border-gray-200 flex items-center px-2"
                style={{ left: m.start * cellWidth, width: m.width * cellWidth }}
              >
                <span className="text-xs font-medium text-gray-600">{m.label}</span>
              </div>
            ))}
            {/* Today marker in header */}
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-400 z-20"
              style={{ left: todayOffset * cellWidth }}
            >
              <span className="absolute -top-0 -left-5 text-xs text-red-500 font-medium whitespace-nowrap">
                Today
              </span>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="relative">
          {/* Today vertical line */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-300 z-10 pointer-events-none"
            style={{ left: labelW + todayOffset * cellWidth }}
          />

          {grouped.map(({ phase, acts }) => (
            <div key={phase?.id ?? 'unphased'}>
              {/* Phase header row */}
              {phase && (
                <div
                  className="flex items-center border-b border-gray-100 bg-gray-50"
                  style={{ height: 30 }}
                >
                  <div
                    style={{ width: labelW, minWidth: labelW }}
                    className="px-4 flex items-center gap-2 border-r border-gray-100 flex-shrink-0"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PHASE_COLORS[phase.order_index] || '#6b7280' }}
                    />
                    <span className="text-xs font-semibold text-gray-600 truncate">{phase.name}</span>
                    <span className={`badge text-xs ml-auto ${
                      phase.status === 'completed' ? 'bg-green-100 text-green-700' :
                      phase.status === 'active'    ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {phase.status}
                    </span>
                  </div>
                  <div className="flex-1 bg-gray-50" style={{ height: 30 }} />
                </div>
              )}

              {/* Activity rows */}
              {acts.length === 0 ? (
                <div className="flex border-b border-gray-50" style={{ height: rowH }}>
                  <div style={{ width: labelW }} className="px-4 flex items-center border-r border-gray-100 flex-shrink-0">
                    <span className="text-xs text-gray-300 italic">No activities in this phase</span>
                  </div>
                  <div className="flex-1" />
                </div>
              ) : (
                acts.map(act => {
                  const s = differenceInDays(parseISO(act.start_date), minDate);
                  const e = differenceInDays(parseISO(act.end_date), minDate);
                  const barW = Math.max((e - s + 1) * cellWidth, 4);
                  const barLeft = s * cellWidth;
                  const fillW = barW * (act.progress / 100);
                  const color = STATUS_FILL[act.status] || '#94a3b8';

                  return (
                    <div key={act.id} className="flex border-b border-gray-50 hover:bg-blue-50/30 group" style={{ height: rowH }}>
                      {/* Label */}
                      <div
                        style={{ width: labelW, minWidth: labelW }}
                        className="px-4 flex items-center border-r border-gray-100 flex-shrink-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{act.name}</p>
                          {act.assignee && (
                            <p className="text-xs text-gray-400 truncate">{act.assignee}</p>
                          )}
                        </div>
                      </div>

                      {/* Bar area */}
                      <div className="flex-1 relative flex items-center">
                        {/* Background grid lines */}
                        {months.map(m => (
                          <div
                            key={m.label}
                            className="absolute top-0 bottom-0 border-r border-gray-100"
                            style={{ left: m.start * cellWidth + m.width * cellWidth - 1 }}
                          />
                        ))}

                        {/* Gantt bar */}
                        <div
                          className="absolute rounded-sm flex items-center overflow-hidden"
                          style={{
                            left: barLeft,
                            width: barW,
                            height: 22,
                            background: `${color}22`,
                            border: `1.5px solid ${color}`,
                          }}
                          title={`${act.name} | ${act.start_date} → ${act.end_date} | ${act.progress}%`}
                        >
                          {/* Progress fill */}
                          <div
                            className="h-full rounded-sm gantt-bar"
                            style={{ width: fillW, background: color, opacity: 0.7 }}
                          />
                          {/* Label inside bar */}
                          {barW > 60 && (
                            <span className="absolute left-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                              {act.progress}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No activities yet. Add activities from the Activities tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
