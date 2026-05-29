# Contributing

Thanks for helping improve `Agent Pet`.

## What kind of contributions are most useful

- New agent adapters
- Better default log path candidates
- Better app detection rules
- Better state detection for native-app / CLI / Web UI hybrids
- Better onboarding and manual configuration UX

## Before you open a PR

1. Run:

```bash
npm install
npm run build
```

2. If your change affects detection:

- mention which agent you tested
- mention whether it was a native app, CLI, or Web UI
- mention which paths or signals were used

## Adapter changes

Most agent-specific changes live in:

- `shared/agentConfig.ts`
- `electron/monitorSources.ts`
- `electron/environmentProbe.ts`

Please prefer:

- adding path candidates instead of replacing existing ones
- making detection rules conservative
- keeping manual override paths editable in settings

## Scope

This project is currently focused on:

- local desktop monitoring
- macOS-first compatibility
- GitHub-distributed alpha releases

Please avoid large unrelated refactors in the same PR as agent-adapter changes.
