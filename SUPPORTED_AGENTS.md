# Supported Agents

这份清单描述的是“当前内置适配器的覆盖方向”，不是“所有环境都零配置可用”的保证。

## 第一批内置适配器

### 本地 App / CLI / 日志混合类型

- Codex
- Claude Code
- Kimi
- Hermes
- OpenClaw

### 编辑器 / IDE / 扩展生态

- Cursor
- Windsurf
- Cline
- Trae
- Roo Code

### 命令行或脚本型

- Aider
- Gemini
- Goose
- OpenHands
- Qoder
- MarsCode
- Coze

## 每个适配器目前会优先看什么

通用优先级：

1. 本地 App 是否存在
2. 默认日志路径是否存在
3. 本地会话页或 Web UI 入口
4. 进程名和命令行关键字

## 为什么仍然需要手动修正

同一个 Agent 在不同用户电脑上，可能存在这些差异：

- 安装方式不同
- 日志目录不同
- App 名称不同
- 入口 URL 不同
- 运行在 CLI、原生 App 或 localhost Web UI 中

所以设置页保留了这些手动修改项：

- 是否启用
- 匹配关键字
- 日志路径
- 会话页面 URL
- 状态接口 URL
- 是否聚合辅助进程

## 后续要继续补的适配方向

如果要继续扩大 GitHub 版可用范围，下一批值得补：

- MarsCode / 豆包相关工具
- Coze
- Roo Code
- Goose
- OpenHands
- 更多 VS Code / Cursor 扩展型 Agent

## 对试用用户的建议

如果开箱后没识别到你的 Agent，优先检查：

1. 你的 Agent 是本地 App、Web UI 还是 CLI
2. 设置页里的默认日志路径是否存在
3. 匹配关键字是否和你机器上的实际进程一致
4. 会话页面 URL 是否需要改成你自己的入口
