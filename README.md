# Agent Pet

一个用于实时查看本机 AI Agent 进程状态的桌面宠物原型项目。

## 产品方向

这个应用分成两层：

1. 宠物层
   - 常驻桌面
   - 透明窗口
   - 根据 Agent 状态切换表情、动作和提示语

2. 监控层
   - 读取本机进程
   - 聚合不同 AI 工具的运行状态
   - 向前端推送实时状态

## 第一版建议功能

- 扫描本机与你开发相关的 Agent 进程
- 显示在线、忙碌、报错、空闲四种状态
- 点击宠物展开详情面板
- 展示每个 Agent 的名称、PID、CPU、内存、运行时长、最近输出摘要
- 系统托盘菜单支持显示/隐藏、刷新、退出

## 技术方案

- Electron: 桌面容器、透明悬浮窗、托盘、系统 API
- React + TypeScript: 宠物 UI 与状态面板
- Vite: 前端构建
- Node 侧监控服务:
  - 第一阶段直接调用系统命令获取进程信息
  - 第二阶段接入你的实际 Agent 日志、任务队列和 API

## 推荐的监控来源

可以按适配器方式逐步接入：

- `process` 适配器: 通过进程名、命令行关键字发现 Agent
- `log` 适配器: 监听日志文件，提取最近状态
- `http` 适配器: 读取本地 Agent 暴露的健康检查接口
- `sdk` 适配器: 直接接你自己的 Agent 管理器

## 当前已实现

- 透明无边框悬浮窗
- 托盘显示/隐藏与退出
- 点击宠物展开或收起监控面板
- 靠近屏幕边缘自动吸附
- 窗口位置与展开状态持久化
- 手动刷新和 3 秒轮询刷新
- 基于规则表识别常见 AI Agent 进程
- 用户配置文件模型
- 设置页 UI
- 安装包打包脚本

## 监控结构

当前监控源在：

- `electron/monitorSources.ts`

现在先接了进程扫描源，后面可以继续往这里加：

- 日志文件源
- 本地 HTTP 健康检查源
- 你自己的任务管理器或 Agent SDK

## 规则配置

当前进程识别规则位于：

- `shared/agentConfig.ts`

你可以直接在这里扩展你自己的 Agent：

- 修改 `AGENT_RULES`
- 调整 `MONITOR_THRESHOLDS`
- 配置 `AGENT_LOG_RULES`

应用运行时的用户配置文件会保存在系统用户目录下，其他电脑安装后可以通过应用内设置页直接修改，不需要改源码。

## 当前项目结构

```text
agent-pet/
  electron/
  shared/
  src/
  index.html
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
```

## 下一步

1. 安装依赖
2. 运行开发环境
3. 先把你实际在用的 Agent 类型整理出来
4. 补第一个真实适配器

## 开发命令

```bash
npm install
npm run dev
```

## 打包命令

首次打包前先安装新增依赖：

```bash
npm install
```

构建安装包：

```bash
npm run dist
```

仅构建 macOS 安装包：

```bash
npm run dist:mac
```

产物会输出到：

```text
release/
```
