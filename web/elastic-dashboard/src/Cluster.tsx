import { useState } from 'react';
import { Clock3, Info, Layers, Repeat, Server, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Metric } from './Metric';
import { type ClusterDashboard, type ClusterJob, type CohortStats, type ElasticProfileStats, cohortStats, compareCohorts, completedJct, dateTime, elasticCountBuckets, elasticProfiles, finite, fmt, median } from './model';

const statusLabel = { completed: '已完成', running: '运行中', failed: '失败', unknown: '未知' };
const statusTone = { completed: 'green', running: 'blue', failed: 'red', unknown: 'neutral' };

function minutes(value: number | null) { return finite(value) ? value / 60 : null; }
function shortDateTime(at: number | null) { return finite(at) ? new Date(at * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'; }
function width(value: number | null, max: number) { return finite(value) && max > 0 ? Math.min(100, value / max * 100) : 0; }

function JctBar({ label, hint, value, max, kind }: { label: string; hint: string; value: number | null; max: number; kind: 'baseline' | 'actual' }) {
  return <div className="bar-row"><span>{label}<small>{hint}</small></span><div className="bar-track"><div className={`bar ${kind}`} style={{ width: `${width(value, max)}%` }}/></div><b>{fmt(minutes(value), 'min')}</b></div>;
}
function ComparisonSummary({ base, candidate, baseLabel, candidateLabel }: { base: CohortStats; candidate: CohortStats; baseLabel: string; candidateLabel: string }) {
  const { delta, ratio } = compareCohorts(base, candidate);
  if (!finite(delta)) return <div className="compare-summary neutral"><Info size={16}/><span>已完成样本不足，暂无法生成对比结论。</span></div>;
  const faster = delta < 0;
  return <div className={`compare-summary ${faster ? 'better' : delta > 0 ? 'worse' : 'neutral'}`}>
    {faster ? <TrendingDown size={17}/> : <TrendingUp size={17}/>}
    <div><strong>{faster ? 'JCT 缩短' : delta > 0 ? 'JCT 延长' : 'JCT 持平'} {delta === 0 ? '' : fmt(minutes(Math.abs(delta)), '分钟')}{finite(ratio) && delta !== 0 ? `（${fmt(ratio * 100, '%', true)}）` : ''}</strong><span>{candidateLabel} 相对 {baseLabel}</span></div>
  </div>;
}
function ProfileComparison({ profiles }: { profiles: ElasticProfileStats[] }) {
  const [baseKey, setBaseKey] = useState(''), [candidateKey, setCandidateKey] = useState('');
  if (!profiles.length) return <section className="panel compare-panel"><div className="section-heading"><h2>平均 JCT 对比 <span className="heading-divider">·</span> 弹性-弹性</h2></div><div className="empty">暂无弹性任务方案分组</div></section>;
  const base = profiles.find(profile => profile.name === baseKey) ?? profiles[0];
  const candidate = profiles.find(profile => profile.name === candidateKey) ?? profiles[1] ?? profiles[0];
  const max = Math.max(base.stats.avgJct ?? 0, candidate.stats.avgJct ?? 1);
  return <section className="panel compare-panel">
    <div className="section-heading"><h2>平均 JCT 对比 <span className="heading-divider">·</span> 弹性-弹性</h2><span className="subtle">算法优化 / 更换前后</span></div>
    <div className="compare-controls">
      <label>基线<select aria-label="基线弹性方案" value={base.name} onChange={event => setBaseKey(event.target.value)}>{profiles.map(profile => <option key={profile.name} value={profile.name}>{profile.name}</option>)}</select></label>
      <label>对比<select aria-label="对比弹性方案" value={candidate.name} onChange={event => setCandidateKey(event.target.value)}>{profiles.map(profile => <option key={profile.name} value={profile.name}>{profile.name}</option>)}</select></label>
    </div>
    <div className="bars compare-bars">
      <JctBar label={base.name} hint={`${base.stats.completed} 个已完成`} value={base.stats.avgJct} max={max} kind="baseline"/>
      <JctBar label={candidate.name} hint={`${candidate.stats.completed} 个已完成`} value={candidate.stats.avgJct} max={max} kind="actual"/>
    </div>
    <ComparisonSummary base={base.stats} candidate={candidate.stats} baseLabel={base.name} candidateLabel={candidate.name}/>
    <div className="footnote"><Info size={14}/>按任务记录的弹性方案分组；切换基线与对比组，可比较算法优化或更换算法前后的平均 JCT。</div>
  </section>;
}
function ElasticCountPanel({ elastic, profiles, jobs }: { elastic: CohortStats; profiles: ElasticProfileStats[]; jobs: ClusterJob[] }) {
  const counts = jobs.filter(job => job.elastic).map(job => job.elastic_count).filter(finite);
  const buckets = elasticCountBuckets(jobs), max = Math.max(1, ...buckets.map(bucket => bucket.count));
  return <section className="panel">
    <div className="section-heading"><h2>所有弹性任务平均弹性次数</h2><span className="subtle">全生命周期 · 已记录调整事件</span></div>
    <div className="elastic-layout">
      <div className="elastic-hero">
        <div className="metric-title">所有弹性任务平均</div>
        <div className="elastic-value">{fmt(elastic.avgElastic, '次')}<small>/ 任务</small></div>
        <div className="muted elastic-sub">共 {fmt(elastic.totalElastic, '次')} · {elastic.elasticTasks} 个弹性任务 · 中位数 {fmt(median(counts), '次')}</div>
        {elastic.recordedElastic < elastic.elasticTasks && <div className="elastic-note"><Info size={13}/>{elastic.elasticTasks - elastic.recordedElastic} 个弹性任务缺少次数记录，未计入平均值</div>}
      </div>
      <div className="distribution" aria-label="弹性次数分布">
        <div className="distribution-title">次数分布</div>
        {buckets.map(bucket => <div className="dist-row" key={bucket.label}><span>{bucket.label}</span><div className="dist-track"><div className="dist-fill" style={{ width: `${bucket.count / max * 100}%` }}/></div><b>{bucket.count} 个</b></div>)}
      </div>
    </div>
    <div className="footnote"><Info size={14}/>分组均值：{profiles.length ? profiles.map(profile => `${profile.name} ${fmt(profile.stats.avgElastic, '次')}`).join(' · ') : '暂无弹性方案分组'}；非弹性任务与缺记录任务不计入。</div>
  </section>;
}
function ClusterJobs({ jobs }: { jobs: ClusterJob[] }) {
  const rows = [...jobs].sort((a, b) => (b.submitted_at ?? 0) - (a.submitted_at ?? 0));
  return <section className="panel">
    <div className="section-heading"><h2>集群任务明细 <span className="count">{jobs.length}</span></h2><span className="subtle">按提交时间倒序</span></div>
    <div className="table-scroll"><table><thead><tr>{['作业', '类型', '弹性方案', '提交时间', 'JCT', '弹性次数', '状态'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>
      {rows.map(job => <tr key={job.uid}>
        <td><span className="job-name">{job.name}</span><small>{job.uid}</small></td>
        <td><Badge tone={job.elastic ? 'blue' : 'neutral'}>{job.elastic ? '弹性' : '非弹性'}</Badge></td>
        <td>{job.elastic ? job.elastic_profile ?? '未标注' : '—'}</td>
        <td>{shortDateTime(job.submitted_at)}</td>
        <td>{fmt(minutes(completedJct(job)), '分钟')}</td>
        <td>{job.elastic ? fmt(job.elastic_count, '次') : '—'}</td>
        <td><Badge tone={statusTone[job.status]}>{statusLabel[job.status]}</Badge></td>
      </tr>)}
    </tbody></table></div>
  </section>;
}

export default function ClusterOverview({ data }: { data: ClusterDashboard }) {
  const all = cohortStats(data.jobs);
  const elastic = cohortStats(data.jobs.filter(job => job.elastic));
  const nonElastic = cohortStats(data.jobs.filter(job => !job.elastic));
  const profiles = elasticProfiles(data.jobs);
  const maxJct = Math.max(nonElastic.avgJct ?? 0, elastic.avgJct ?? 1);
  return <>
    <section className="panel cluster-overview">
      <div className="section-heading"><h2>集群总览</h2><span className="subtle">全部任务平均 JCT 与弹性次数</span></div>
      <div className="metrics-grid">
        <Metric icon={<Clock3 color="#1769ff"/>} title="全部任务平均 JCT" value={fmt(minutes(all.avgJct), '分钟')} hint={`${all.completed} 个已完成 / ${all.total} 个任务`} tone="neutral"/>
        <Metric icon={<Layers/>} title="弹性任务平均 JCT" value={fmt(minutes(elastic.avgJct), '分钟')} hint={`${elastic.completed} 个已完成 · 共 ${elastic.elasticTasks} 个弹性任务`}/>
        <Metric icon={<Server/>} title="非弹性任务平均 JCT" value={fmt(minutes(nonElastic.avgJct), '分钟')} hint={`${nonElastic.completed} 个已完成 · 共 ${nonElastic.total} 个非弹性任务`} tone="neutral"/>
        <Metric icon={<Repeat/>} title="弹性任务平均弹性次数" value={fmt(elastic.avgElastic, '次')} hint={`共 ${fmt(elastic.totalElastic, '次')} · ${elastic.recordedElastic === elastic.elasticTasks ? `${elastic.elasticTasks} 个弹性任务` : `${elastic.recordedElastic}/${elastic.elasticTasks} 个弹性任务有记录`}`}/>
      </div>
    </section>
    <div className="cluster-compare-grid">
      <section className="panel compare-panel">
        <div className="section-heading"><h2>平均 JCT 对比 <span className="heading-divider">·</span> 弹性 vs 非弹性</h2><span className="subtle">已完成任务 · 含排队时间</span></div>
        <div className="bars compare-bars">
          <JctBar label="非弹性任务" hint={`${nonElastic.completed} 个已完成`} value={nonElastic.avgJct} max={maxJct} kind="baseline"/>
          <JctBar label="弹性任务" hint={`${elastic.completed} 个已完成`} value={elastic.avgJct} max={maxJct} kind="actual"/>
        </div>
        <ComparisonSummary base={nonElastic} candidate={elastic} baseLabel="非弹性任务" candidateLabel="弹性任务"/>
        <div className="footnote"><Info size={14}/>组内平均 JCT = 已完成任务提交至完成的时长均值；运行中、失败任务不计入。</div>
      </section>
      <ProfileComparison profiles={profiles}/>
    </div>
    <ElasticCountPanel elastic={elastic} profiles={profiles} jobs={data.jobs}/>
    <ClusterJobs jobs={data.jobs}/>
    {data.missing_data.length > 0 && <div className="missing"><Info size={16}/><div><strong>数据完整性提示</strong><p>{data.missing_data.join(' · ')}</p></div></div>}
    <footer><span>DLRover · Elastic Insights</span><span>快照 {dateTime(data.generated_at)} · 集群级汇总 · 平均值按已完成任务统计</span></footer>
  </>;
}
