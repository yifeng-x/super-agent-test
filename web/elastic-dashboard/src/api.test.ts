import { afterEach, expect, it, vi } from 'vitest';
import { loadClusterDashboard, loadClusters, loadDashboard, loadJobs } from './api';
import { demoClusterDashboard, demoDashboard } from './demo';
afterEach(() => vi.unstubAllGlobals());
it('真实接口失败不降级为示例数据', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));
  await expect(loadJobs('api',new AbortController().signal)).rejects.toThrow('503');
});
it('拒绝其他作业响应，防止串任务', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(demoDashboard('demo-train-001')))));
  await expect(loadDashboard('api','different-job',new AbortController().signal)).rejects.toThrow('UID 不匹配');
});
it('透传取消信号并编码 UID', async () => {
  const data=demoDashboard('demo-train-001'); data.job.uid='uid/with space';
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify(data))); vi.stubGlobal('fetch',fetchMock);
  const signal=new AbortController().signal;
  await loadDashboard('api',data.job.uid,signal);
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/elastic/jobs/uid%2Fwith%20space/dashboard',expect.objectContaining({signal}));
});
it('集群接口失败不降级为示例数据', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));
  await expect(loadClusters('api',new AbortController().signal)).rejects.toThrow('503');
});
it('拒绝其他集群响应，防止串集群', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(demoClusterDashboard('demo-cluster')))));
  await expect(loadClusterDashboard('api','other-cluster',new AbortController().signal)).rejects.toThrow('集群名称不匹配');
});
it('透传取消信号并编码集群名', async () => {
  const data=demoClusterDashboard('demo-cluster-b'); data.cluster='demo cluster/b';
  const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify(data))); vi.stubGlobal('fetch',fetchMock);
  const signal=new AbortController().signal;
  await loadClusterDashboard('api',data.cluster,signal);
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/elastic/clusters/demo%20cluster%2Fb/dashboard',expect.objectContaining({signal}));
});
