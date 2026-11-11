import { ClusterDashboard, ClusterJob, Dashboard, Evaluation } from './model';
const at = (time: string) => Date.parse(`2026-11-06T${time}+08:00`) / 1000;
const evaluation: Evaluation = { stage: 'exploration', objective: 'time', work_unit: 'steps', data_source: 'mock', valid: true, observed_at: at('14:36:00'), max_age_seconds: 60, time_gain_seconds: 1440, gpu_seconds_saved: 1320, gain_ratio: .75, min_gain_ratio: .05, baseline_throughput: 2, candidate_throughput: 9.85, windows: 2, state: 'accepted', reported: true };
export const demoJobs = [
  { uid: 'demo-train-001', name: 'train-001', cluster: 'demo-cluster', namespace: 'elastic-training', status: 'completed' as const },
  { uid: 'demo-train-002', name: 'train-002', cluster: 'demo-cluster', namespace: 'elastic-training', status: 'running' as const },
];
export function demoDashboard(uid: string): Dashboard {
  const job = demoJobs.find(j => j.uid === uid) ?? demoJobs[0];
  const data: Dashboard = {
    schema_version: 1, generated_at: at('14:40:00'), job,
    jct: { submitted_at: at('13:04:00'), completed_at: at('14:40:00'), baseline_seconds: 7200, baseline_frozen_at: at('14:32:00'), baseline_source: 'estimate', baseline_description: '原配置吞吐估算' },
    latest_evaluation: evaluation, summary: { attempted: 2, succeeded: 1, failed: 1, complete: true },
    series: { work_unit: 'steps', points: Array.from({ length: 41 }, (_, i) => ({ at: at('14:30:00') + i * 15, gpus: i < 12 ? 2 : 4, throughput: i < 8 ? 2 + Math.sin(i) * .06 : i < 14 ? 0 : 9.85 + Math.sin(i) * .1 })) },
    events: [
      { id: 'evt-003', plan_id: 'plan-003', occurred_at: at('14:32:00'), type: 'expand', trigger: '吞吐优化', before_gpus: 2, target_gpus: 4, actual_gpus: 4, execution_status: 'completed', recovery_status: 'verified_by_exploration', conclusion: 'accepted', reason: 'positive_observed_gain', interruption_seconds: 85, interruption_start: at('14:32:00'), interruption_end: at('14:33:25'), evaluation, stages: [ { name: '开始调整', at: at('14:32:00') }, { name: 'checkpoint 完成', at: at('14:32:15') }, { name: '资源替换完成', at: at('14:32:50') }, { name: '恢复训练', at: at('14:33:25') }, { name: '收益评估完成', at: at('14:36:00') } ], before_finish_at: at('15:04:00'), after_finish_at: at('14:40:00') },
      { id: 'evt-002', plan_id: 'plan-002', occurred_at: at('14:10:00'), type: 'shrink', trigger: '资源回收', before_gpus: 2, target_gpus: 1, actual_gpus: 2, execution_status: 'skipped', recovery_status: 'not_started', conclusion: 'rejected', reason: 'insufficient_gain', interruption_seconds: null, interruption_start: null, interruption_end: null, evaluation: { ...evaluation, stage: 'prediction', observed_at: at('14:10:00'), gain_ratio: -.12, time_gain_seconds: -300, gpu_seconds_saved: 600, state: null }, stages: [{ name: '收益门禁拒绝', at: at('14:10:00') }], before_finish_at: null, after_finish_at: null },
      { id: 'evt-001', plan_id: 'plan-001', occurred_at: at('13:55:00'), type: 'expand', trigger: '人工调整', before_gpus: 2, target_gpus: 4, actual_gpus: 2, execution_status: 'failed', recovery_status: 'unknown', conclusion: 'failed', reason: 'replacement_failed', interruption_seconds: null, interruption_start: null, interruption_end: null, evaluation: null, stages: [{ name: '开始调整', at: at('13:55:00') }, { name: '资源替换失败', at: at('13:57:00') }], before_finish_at: null, after_finish_at: null },
    ], missing_data: [],
  };
  if (job.status === 'running') {
    data.jct = { ...data.jct, completed_at: null, baseline_seconds: null, baseline_frozen_at: null, baseline_source: 'unavailable', baseline_description: '尚未冻结基线' };
    data.latest_evaluation = { ...evaluation, valid: false, observed_at: null, time_gain_seconds: null, gpu_seconds_saved: null, gain_ratio: null, state: 'inconclusive', windows: 1, reported: false };
    data.events = []; data.series.points = []; data.summary = { attempted: null, succeeded: null, failed: null, complete: false };
    data.missing_data = ['尚无完整观测窗口', '尚无持久化事件记录', 'JCT 基线未冻结'];
  }
  return structuredClone(data);
}
function clusterJob(uid: string, name: string, status: ClusterJob['status'], start: string, jctMinutes: number | null, elastic: boolean, profile: string | null, elasticCount: number | null): ClusterJob {
  const submitted_at = at(start);
  return { uid, name, status, submitted_at, completed_at: jctMinutes === null ? null : submitted_at + jctMinutes * 60, jct_seconds: jctMinutes === null ? null : jctMinutes * 60, elastic, elastic_profile: profile, elastic_count: elasticCount };
}
const v1 = '弹性算法 v1（优化前）', v2 = '弹性算法 v2（优化后）';
const clusterA: ClusterJob[] = [
  clusterJob('cluster-a-train-101', 'resnet50-a', 'completed', '08:10:00', 138, false, null, 0),
  clusterJob('cluster-a-train-102', 'bert-large-a', 'completed', '08:40:00', 126, false, null, 0),
  clusterJob('cluster-a-train-103', 'vit-b16-a', 'completed', '09:05:00', 152, false, null, 0),
  clusterJob('cluster-a-train-104', 'gpt2-a', 'completed', '09:30:00', 120, false, null, 0),
  clusterJob('cluster-a-train-105', 'mnist-a', 'completed', '09:55:00', 144, false, null, 0),
  clusterJob('cluster-a-train-201', 'rec-train-201', 'completed', '10:20:00', 122, true, v1, 6),
  clusterJob('cluster-a-train-202', 'rec-train-202', 'completed', '10:45:00', 116, true, v1, 4),
  clusterJob('cluster-a-train-203', 'rec-train-203', 'completed', '11:10:00', 130, true, v1, 7),
  clusterJob('cluster-a-train-204', 'rec-train-204', 'completed', '11:30:00', 108, true, v1, 5),
  clusterJob('cluster-a-train-205', 'rec-train-205', 'completed', '11:50:00', 124, true, v1, 6),
  clusterJob('cluster-a-train-301', 'llm-sft-301', 'completed', '12:10:00', 92, true, v2, 3),
  clusterJob('cluster-a-train-302', 'llm-sft-302', 'completed', '12:25:00', 88, true, v2, 2),
  clusterJob('cluster-a-train-303', 'llm-sft-303', 'completed', '12:40:00', 100, true, v2, 4),
  clusterJob('cluster-a-train-304', 'llm-sft-304', 'completed', '12:55:00', 96, true, v2, 3),
  clusterJob('cluster-a-train-305', 'llm-sft-305', 'completed', '13:10:00', 84, true, v2, 2),
  clusterJob('cluster-a-train-306', 'llm-sft-306', 'running', '15:40:00', null, true, v2, null),
];
const algoA = '弹性算法 A（替换前）', algoB = '弹性算法 B（替换后）';
const clusterB: ClusterJob[] = [
  clusterJob('cluster-b-train-401', 'cv-seg-a', 'completed', '08:30:00', 162, false, null, 0),
  clusterJob('cluster-b-train-402', 'cv-seg-b', 'completed', '09:00:00', 144, false, null, 0),
  clusterJob('cluster-b-train-403', 'cv-seg-c', 'completed', '09:30:00', 156, false, null, 0),
  clusterJob('cluster-b-train-501', 'reco-a1', 'completed', '10:00:00', 128, true, algoA, 5),
  clusterJob('cluster-b-train-502', 'reco-a2', 'completed', '10:30:00', 140, true, algoA, 6),
  clusterJob('cluster-b-train-503', 'reco-a3', 'completed', '11:00:00', 136, true, algoA, 4),
  clusterJob('cluster-b-train-601', 'reco-b1', 'completed', '11:30:00', 110, true, algoB, 3),
  clusterJob('cluster-b-train-602', 'reco-b2', 'completed', '12:00:00', 104, true, algoB, 2),
  clusterJob('cluster-b-train-603', 'reco-b3', 'completed', '12:30:00', 118, true, algoB, 3),
];
export const demoClusters = [{ name: 'demo-cluster' }, { name: 'demo-cluster-b' }];
export function demoClusterDashboard(cluster: string): ClusterDashboard {
  const isSecond = cluster === 'demo-cluster-b';
  return structuredClone({
    schema_version: 1 as const, generated_at: at('16:30:00'), cluster: isSecond ? 'demo-cluster-b' : 'demo-cluster',
    jobs: isSecond ? clusterB : clusterA,
    missing_data: isSecond ? [] : ['1 个运行中任务尚未完成，暂未计入平均 JCT 与平均弹性次数'],
  });
}
