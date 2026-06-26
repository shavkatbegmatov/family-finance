import type { CSSProperties } from 'react';
import { InsightCard } from '../common/InsightCard';
import type { DashboardInsight } from '../../hooks/useDashboardInsights';

/**
 * Yuqoridagi insightlar — AI tipida avtomatik xulosalar (birinchi navbatda
 * max 2 ta, animatsiya indeksi <code>--i</code> bilan). Original DashboardPage
 * bilan AYNAN bir xil.
 */
export function InsightCardsTop({ insights }: { insights: DashboardInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {insights.slice(0, 2).map((insight, i) => (
        <InsightCard
          key={insight.id}
          tone={insight.tone}
          title={insight.title}
          message={insight.message}
          style={{ '--i': i } as CSSProperties}
        />
      ))}
    </div>
  );
}

/**
 * Qo'shimcha insightlar — agar ikkitadan ko'p bo'lsa, qolganlarini compact
 * ko'rinishda ko'rsatish. Original DashboardPage bilan AYNAN bir xil.
 */
export function InsightCardsExtra({ insights }: { insights: DashboardInsight[] }) {
  if (insights.length <= 2) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {insights.slice(2).map((insight) => (
        <InsightCard
          key={insight.id}
          tone={insight.tone}
          title={insight.title}
          message={insight.message}
          compact
        />
      ))}
    </div>
  );
}
