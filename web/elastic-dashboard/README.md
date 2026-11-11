# DLRover 弹性分析前端

React + TypeScript + Vite 独立工程。按 UI 原型实现任务级弹性收益、JCT 复盘、GPU/吞吐时序、事件分析，以及集群级平均 JCT 与平均弹性次数观测。原生 SVG 绘图，无外部字体或 CDN 依赖。

```bash
cd web/elastic-dashboard
npm ci
npm run dev
```

打开终端输出的本地地址（默认 http://127.0.0.1:5173）。

- 默认**演示模式**，所有数据均明确标识为示例。`train-001` 展示完成作业，`train-002` 展示运行中及缺失数据。
- 顶部“任务级观测 / 集群级观测”切换观测层级；`?view=cluster` 可直接打开集群级页面。集群页展示全部任务平均 JCT、弹性/非弹性平均 JCT 对比、弹性算法方案之间的平均 JCT 对比，以及所有弹性任务的平均弹性次数与次数分布。
- 集群页的演示集群为 `demo-cluster` 与 `demo-cluster-b`。平均 JCT 只统计已完成任务（含排队时间），平均弹性次数只统计弹性任务的全生命周期已记录事件数；运行中、失败与缺失记录的任务按页面提示排除。
- 切换**真实 API**读取 `/api/v1/elastic/jobs`、作业 dashboard、`/api/v1/elastic/clusters` 和 `/api/v1/elastic/clusters/{cluster}/dashboard` 接口。聚合服务已实现，按[服务说明](../../dlrover/dashboard/elastic/README.md)启动并导入真实事件；可用 `?mode=api` 直接进入真实模式。失败时显示错误，绝不自动混入 mock。
- 集群级响应协议为 `schema_version: 1`，包含 `cluster`、`generated_at`、`jobs`（`status`、`jct_seconds`、`elastic`、`elastic_profile`、`elastic_count`）和 `missing_data`；可执行类型校验位于 `src/model.ts`，聚合口径函数同文件。
- 本地 `/api` 由 Vite 代理到 `http://127.0.0.1:8080`，可修改 `vite.config.ts`。生产构建需要部署侧配置同源反向代理和登录鉴权，浏览器不保存 SwanLab/Prometheus 服务令牌。
- 也可在启动时设置 `DLROVER_ELASTIC_API_URL=http://127.0.0.1:18080` 指向其他本地后端端口；这是 Vite 服务端配置，不注入浏览器。
- 时间范围只筛选事件与趋势；顶部 JCT、最新评估及全生命周期次数保持任务级口径。
- `GPU 变化`是计划值；实际 GPU 独立展示。收益有效性不等价于执行、恢复或收益达标。
- 采样时间使用 Unix 秒，界面以 Asia/Shanghai 显示。图表保留 null 断点，负收益不截断。

```bash
npm test
npm run build
npm run preview
```

`npm test` 中的跨语言协议测试需要 PATH 中存在 Python 3 且能导入 `dlrover.dashboard.elastic` 聚合服务；只检出本前端工程时会自动跳过该用例。

构建输出 `dist/`。接口的可执行类型校验位于 `src/model.ts`，示例数据位于 `src/demo.ts`。后续接入无需改动展示组件。后端入口为 `python -m dlrover.dashboard.elastic --host 0.0.0.0 --port 8080`。集群级页面在真实 API 模式下读取 `/api/v1/elastic/clusters` 与 `/api/v1/elastic/clusters/{cluster}/dashboard`，需聚合服务提供对应集群汇总数据；演示模式无需后端。尚未自动部署、执行资源调整或实现完整 JCT 收益结算。缺少生命周期显示“未知”，不完整统计显示“已记录次数”。

生产聚合服务使用 MySQL，并通过 K8s ClusterIP Service 暴露；部署方法见 [MySQL + Kubernetes](../../deploy/elastic-dashboard/README.md)。聚合服务为内部接口，无需 read/ingest token；前端通过平台同源代理访问。
