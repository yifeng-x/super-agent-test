import type { ReactNode } from 'react';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Metric({ title, value, hint, icon, tone = 'blue' }: { title: string; value: string; hint?: string; icon: ReactNode; tone?: string }) {
  return <div className="metric"><span className={`metric-icon ${title.includes('时间') && !title.includes('收益率') || title.includes('基线 JCT') ? 'blue' : tone}`}>{icon}</span><div><div className="metric-title">{title}</div><div className={`metric-value ${tone}`}>{value}</div>{hint && <div className="muted metric-hint">{hint}</div>}</div></div>;
}
