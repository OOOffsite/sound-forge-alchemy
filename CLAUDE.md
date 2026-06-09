# Sound Forge Alchemy - Project Instructions

## Resume Parity (cross-repo)

This repo and `~/Developer/sfa` are two repos representing **one logical project**. Running `resume` in either directory should land Claude Code, Cursor, Aider, or any other copilot on the same project state. The bridge:

- **Auto-memory `MEMORY.md`** mirrors a `cross-repo-pointer` entry in both `~/.claude/projects/-Users-jeremiah-Developer-sound-forge-alchemy/memory/` and `~/.claude/projects/-Users-jeremiah-Developer-sfa/memory/`.
- **Project `CLAUDE.md`** in both repos explicitly names the other and identifies which is canonical (`sfa`).
- **Top-level `~/Developer/sfa/CLAUDE.md`** + `AGENTS.md` + `.vscode-copilot-instructions.md` extend the same anchors to non-Claude tools.
- **`/upm sync` orientation**: regardless of which cwd opens the session, sync mutations target `~/Developer/sfa` (Plane SFA project tracks that repo's history; see `memory/upm-sync-orientation.md`).

## Authoritative Source Directory

The Phoenix/Elixir application lives at:

```
/Users/jeremiah/Developer/sfa
```

This is the **authoritative working directory** for all SFA implementation work. The root repo at `~/Developer/sound-forge-alchemy` contains the React prototype and the `alchemy2/` refactor experiment, but the production Elixir/Phoenix codebase is at `~/Developer/sfa`.

Always `cd` to or reference `/Users/jeremiah/Developer/sfa` when reading, editing, or building SFA code. The `alchemy2/` directory in this repo is a separate architectural experiment — work on it stays here, but it should never be confused with canonical SFA.

## Stack

- **Backend**: Elixir, Phoenix LiveView, Oban (background jobs), Ecto/PostgreSQL
- **Frontend**: Phoenix HEEx templates, daisyUI/Tailwind CSS, JS hooks
- **Audio**: SpotDL (Spotify metadata/download), Demucs (stem separation), Python analyzer, lalal.ai API (cloud separation)
- **Auth**: Phoenix built-in auth with Spotify OAuth integration

## Environment Variables

- **Authoritative source**: `~/Developer/sfa/.env`
- Contains `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for Spotify API access
- `LALALAI_API_KEY` -- lalal.ai cloud stem separation API key (optional, enables cloud separation)
- Loaded by `config/runtime.exs` via `System.get_env/1`
- Must be sourced before starting the Phoenix server: `source .env && mix phx.server`

## Hooks (User-Level Authority)

- **Disk Space Check**: `~/.claude/hooks/disk_space_check.sh` -- PreToolUse hook (user `settings.json`) that monitors available disk space and runs `dtf.d --force` when below 750MB. 5-minute cooldown between checks. Authoritative source: user-level `~/.claude/settings.json`.

## Active Focal Points (2026-02-17)

### Playback System
- **Local/Spotify toggle**: Downloaded tracks default to local Web Audio playback; users can toggle to Spotify via a tab switch. Local mode shows bitrate, codec, kHz metadata for audiophiles.
- **Player routing**: `play_track` handler in dashboard_live.ex routes downloaded+stemmed tracks to AudioPlayerLive, Spotify-only tracks to Spotify SDK.

### Stem Separation Pipeline
- **Dual engine**: Local Demucs (htdemucs, htdemucs_ft, htdemucs_6s, mdx_extra) + cloud lalal.ai API
- **Engine toggle**: Users choose local or lalal.ai in settings; model comparison tooltips explain tradeoffs
- **lalal.ai extras**: More stem types (vocals, drums, bass, electric guitar, acoustic guitar, piano, synth, strings, wind), preview first 60s without full download
- **URL paths**: Stem file_path stored as relative paths (not absolute) to produce clean `/files/stems/...` URLs

### Analysis Visualizations
- 5 D3.js hooks: AnalysisRadar, AnalysisChroma, AnalysisBeats, AnalysisMFCC, AnalysisSpectral
- Registered in `assets/js/app.js`, rendered in track detail view

### Pipeline UX
- `pipeline_complete?/1` checks only triggered stages (not hardcoded analysis)
- Dismiss button always visible, styled by completion state
- `:pipeline_complete` handler only marks stages that were tracked

### PM Skills Integration
- 34+ PM skills from deanpeters/Product-Manager-Skills installed globally at `~/.claude/skills/`
- Three types: Component (artifacts), Interactive (guided discovery), Workflow (end-to-end)
- Coordinate with `/elixir-architect` and `/ralph` for implementation planning

### APM Enhancements
- CCEM APM at `~/Developer/ccem/apm/` -- port 3031, Python stdlib server
- Adding: browser push notifications, osascript/Swift toast notifications, macOS menubar extra (NSStatusItem)
- Multi-project awareness: verify apm_config.json project_name matches working directory

### Orchestration Methodology
- Ralph methodology for autonomous fix loops
- Live integration testing for quality control
- Checkpointing between phases for resiliency
- PM Skills interpreter for requirement analysis before implementation
