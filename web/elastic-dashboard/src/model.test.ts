import { describe, expect, it } from 'vitest';
import { demoClusterDashboard, demoDashboard } from './demo';
import { clusterDashboardSchema, cohortStats, compareCohorts, completedJct, dashboardSchema, elasticCountBuckets, elasticProfiles, filteredEvents, fmt, gainValue, jctValues, elapsedJct } from './model';

describe('收益口径与空值', () => {
  it('任务级 JCT 按提交到完成计算，不能使用剩余时间收益率', () => {
    const data=demoDashboard('demo-train-001');
    expect(jctValues(data)).toEqual({actual:5760,baseline:7200,gain:1440,ratio:.2});
    expect(data.latest_evaluation?.gain_ratio).toBe(.75);
  });
  it('运行中、缺基线或时间倒置不生成实际收益', () => {
    expect(jctValues(demoDashboard('demo-train-002')).gain).toBeNull();
    const data=demoDashboard('demo-train-001'); data.jct.baseline_frozen_at=null;
    expect(jctValues(data).gain).toBeNull();
    data.jct.completed_at=data.jct.submitted_at!-1;
    expect(jctValues(data).actual).toBeNull();
  });
  it('负收益保留；无效结果不会被当作零收益', () => {
    const data=demoDashboard('demo-train-001'); const e=data.events[1].evaluation!;
    expect(gainValue(e,'time_gain_seconds')).toBe(-300);
    expect(gainValue({...e,valid:false},'time_gain_seconds')).toBeNull();
    expect(fmt(null)).toBe('—'); expect(fmt(0)).toBe('0');
  });
  it('拒绝非有限数值与缺失协议字段', () => {
    const data=demoDashboard('demo-train-001'); data.latest_evaluation!.gain_ratio=NaN;
    expect(dashboardSchema.safeParse(data).success).toBe(false);
    expect(dashboardSchema.safeParse({}).success).toBe(false);
  });
  it('筛选不会把门禁跳过当作扩容成功，且支持时间与关键词', () => {
    const data=demoDashboard('demo-train-001');
    expect(filteredEvents(data.events,'skipped','',0).map(e=>e.id)).toEqual(['evt-002']);
    expect(filteredEvents(data.events,'expand','plan-003',0).map(e=>e.id)).toEqual(['evt-003']);
    expect(filteredEvents(data.events,'all','',data.events[0].occurred_at).length).toBe(1);
  });
});

it('服务端 JCT 字段及运行耗时，失败不展示成功 JCT', () => {
  const running = demoDashboard('demo-train-002');
  expect(elapsedJct(running)).toBe(running.generated_at-running.jct.submitted_at!);
  expect(jctValues(running).actual).toBeNull();
  const done = demoDashboard('demo-train-001');
  done.jct.actual_seconds = null;
  expect(jctValues(done).actual).toBeNull();
  done.jct.actual_seconds = 5760;
  expect(jctValues(done).actual).toBe(5760);
  done.job = {...done.job, status: 'failed'};
  expect(jctValues(done).actual).toBeNull();
  expect(elapsedJct(done)).toBeNull();
});

describe('集群级观测口径', () => {
  it('平均 JCT 只统计已完成任务，平均弹性次数只统计有记录的弹性任务', () => {
    const data = demoClusterDashboard('demo-cluster');
    const all = cohortStats(data.jobs);
    expect(all.total).toBe(16); expect(all.completed).toBe(15); expect(all.avgJct).toBe(116 * 60);
    const elastic = cohortStats(data.jobs.filter(job => job.elastic));
    expect(elastic.avgJct).toBe(106 * 60); expect(elastic.elasticTasks).toBe(11);
    expect(elastic.recordedElastic).toBe(10); expect(elastic.totalElastic).toBe(42);
    expect(elastic.avgElastic).toBeCloseTo(4.2);
    const nonElastic = cohortStats(data.jobs.filter(job => !job.elastic));
    expect(nonElastic.avgJct).toBe(136 * 60);
    const comparison = compareCohorts(nonElastic, elastic);
    expect(comparison.delta).toBe(-30 * 60);
    expect(comparison.ratio).toBeCloseTo(-30 / 136);
  });
  it('弹性-弹性对比按任务记录的算法方案分组', () => {
    const profiles = elasticProfiles(demoClusterDashboard('demo-cluster').jobs);
    expect(profiles.map(profile => profile.name)).toEqual(['弹性算法 v1（优化前）', '弹性算法 v2（优化后）']);
    expect(profiles[0].stats.avgJct).toBe(120 * 60);
    expect(profiles[1].stats.avgJct).toBe(92 * 60);
    expect(compareCohorts(profiles[0].stats, profiles[1].stats).delta).toBe(-28 * 60);
  });
  it('运行中任务不产生 JCT，缺失次数不计入平均', () => {
    const data = demoClusterDashboard('demo-cluster');
    const running = data.jobs.find(job => job.status === 'running')!;
    expect(completedJct(running)).toBeNull();
    expect(running.elastic_count).toBeNull();
    expect(elasticProfiles(data.jobs).find(profile => profile.name === '弹性算法 v2（优化后）')!.stats.avgElastic).toBeCloseTo(14 / 5);
  });
  it('弹性次数分桶覆盖所有已记录任务', () => {
    const buckets = elasticCountBuckets(demoClusterDashboard('demo-cluster').jobs);
    expect(buckets.map(bucket => bucket.label)).toEqual(['1-2 次', '3-4 次', '5-6 次', '7 次以上']);
    expect(buckets.map(bucket => bucket.count)).toEqual([2, 4, 3, 1]);
  });
  it('拒绝非法集群指标与缺失协议字段', () => {
    const data = demoClusterDashboard('demo-cluster');
    expect(clusterDashboardSchema.safeParse(data).success).toBe(true);
    (data.jobs[0] as { jct_seconds: number | null }).jct_seconds = -1;
    expect(clusterDashboardSchema.safeParse(data).success).toBe(false);
    expect(clusterDashboardSchema.safeParse({}).success).toBe(false);
  });
});
