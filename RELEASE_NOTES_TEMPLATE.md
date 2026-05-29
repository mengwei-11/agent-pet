# Agent Pet v0.1.0-alpha

## 这是什么

`Agent Pet` 是一个 macOS 桌宠，用来在本机查看常见 AI Agent 的运行状态。

## 这一版适合谁

- 已经在本机使用多个 AI Agent 的开发者
- 愿意在设置页里做少量路径或入口调整的用户

## 当前支持方向

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

## 这一版重点

- 增加多 Agent 内置适配器
- 增加首次自动探测建议
- 支持本地 App、日志路径、Web UI 入口混合配置
- 支持手动修正匹配关键字、日志路径和会话入口

## 已知限制

- 当前主要面向 `macOS`
- 不是所有 Agent 都能零配置自动识别
- 某些桌面应用只留下弱活动信号，状态判断仍然可能需要继续调优
- 当前更适合 GitHub alpha 试用，不建议承诺 App Store 级稳定性

## 希望用户反馈什么

- 你的 Agent 名称和运行方式
- 你的日志路径或配置目录
- 哪些 Agent 被误判成等待中 / 执行中
- 哪些本地 App 或 Web UI 入口无法正常拉起
