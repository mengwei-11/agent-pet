# Agent Pet

`Agent Pet` 是一个面向开发者的桌面宠物应用，用来在 macOS 桌面上查看本机 AI Agent 的运行状态。

这不是云端面板，也不是托管服务。它的判断逻辑主要基于：

- 本地进程
- 本地应用是否已安装
- 本地日志路径
- 本地 Web UI / localhost 入口

当前版本适合作为 `macOS alpha` 在 GitHub Releases 分发给技术用户试用。

## 当前定位

- 平台：`macOS`
- 发布形态：GitHub 下载试用版
- 用户类型：已经在本机使用 AI Agent 的开发者
- 目标体验：尽量开箱即用，识别不到时允许用户在设置页做少量修改后继续使用

## 这个版本解决什么问题

- 用一个桌宠视图，统一查看多个 Agent 是否在忙
- 在本地 App、CLI、Web UI 混用时，尽量识别出“谁在执行、谁在等待、谁需要注意”
- 给每个 Agent 保留可手动修正的入口：
  - 匹配关键字
  - 日志路径
  - 会话页面 URL
  - 聚合策略

## 当前支持的 Agent 范围

第一批内置适配器已经覆盖这些方向：

- Codex
- Claude Code
- Cline
- Aider
- Trae
- Windsurf
- Cursor
- Gemini
- Kimi
- Hermes
- OpenClaw
- Roo Code
- Goose
- OpenHands
- Qoder
- MarsCode
- Coze

说明：

- 这不代表所有机器都能 100% 自动识别。
- 不同用户可能使用的是本地 App、CLI、VS Code 扩展、Web UI 或 localhost 页面。
- 所以项目内同时提供了自动探测和手动修正。

更详细说明见 [SUPPORTED_AGENTS.md](./SUPPORTED_AGENTS.md)。

## 当前能力

- 透明桌宠窗口
- 顶部宠物状态和气泡播报
- 展开后的 Agent 状态列表
- 本地 App 拉起
- Chrome 中打开 Web UI
- 设置页手动改 Agent 配置
- 设置页新增 / 删除自定义 Agent
- 首次自动探测建议
- 用户配置持久化到本机

## 不承诺的事情

当前版本不承诺：

- 适配所有 Agent
- 在所有电脑上零配置生效
- 提供云端同步
- 直接上 Mac App Store
- 已完成 Windows 支持

## 安装与运行

### 开发环境

```bash
npm install
npm run dev
```

### 构建

```bash
npm run build
```

### 打包 macOS 安装包

```bash
npm run dist:mac
```

产物会输出到：

```text
release/
```

## 推荐的首次使用流程

1. 启动应用
2. 打开设置页
3. 查看“首次配置建议”
4. 点击“应用推荐配置”
5. 如果有未识别或识别不准的 Agent，再手动修改：
   - 日志路径
   - 会话页面 URL
   - 匹配关键字

## 项目结构

```text
agent-pet-github/
  electron/
  shared/
  src/
  package.json
  README.md
  PRIVACY.md
  SUPPORTED_AGENTS.md
```

## 隐私说明

这个项目会读取本机的部分运行时信息，例如：

- 进程名和命令行关键字
- 你手动配置或自动探测到的日志路径
- 本地 localhost 入口

默认目标是“尽量本地处理，不上传原始日志内容”。正式发布前请先阅读 [PRIVACY.md](./PRIVACY.md)。

## GitHub 发布建议

当前更适合这样发布：

- 仓库标记为 `alpha`
- GitHub Releases 上传 `dmg` 和 `zip`
- README 写清支持范围和已知限制
- 收集用户机器上的日志路径差异和适配反馈

## 已知限制

- 某些 Agent 只有进程在线，但没有标准日志，这时状态判断会偏弱
- 某些桌面应用只在自己的私有存储里留下活动痕迹，需要单独适配
- `Codex / Kimi / Hermes / OpenClaw` 这类工具目前仍然带有较强的本地生态依赖
- 如果 preload 或本地执行桥接不完整，应用会退回到手动配置模式

## 许可证

本项目使用 [MIT License](./LICENSE)。
