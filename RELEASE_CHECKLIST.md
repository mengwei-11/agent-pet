# Release Checklist

## 发布前

- [ ] 在 `agent-pet-github` 目录执行 `npm install`
- [ ] 执行 `npm run build`
- [ ] 执行 `npm run dist:mac`
- [ ] 手动试运行一次打包产物
- [ ] 检查 README、PRIVACY、SUPPORTED_AGENTS 是否和当前能力一致
- [ ] 检查设置页里的“首次配置建议”是否可用
- [ ] 至少验证 `Codex`、`Kimi`、`Hermes`、`OpenClaw` 四种典型环境

## GitHub 仓库准备

- [ ] 仓库简介补全
- [ ] 仓库 Topics 补全
- [ ] 上传 LICENSE
- [ ] 配置第一版 Release 文案
- [ ] 在 README 标注 `alpha`

## 第一版 Release 建议内容

- `Agent Pet-<version>-mac-arm64.dmg`
- `Agent Pet-<version>-mac-arm64.zip`
- Release Notes
  - 当前支持的 Agent 范围
  - 已知限制
  - 需要用户反馈的适配问题

## 暂不建议承诺

- [ ] Windows 正式支持
- [ ] Mac App Store 上架
- [ ] 所有 Agent 零配置识别
- [ ] 云同步或团队协作
