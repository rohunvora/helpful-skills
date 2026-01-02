# File Management

## Philosophy

| Intent | Destination | Lifetime |
|--------|-------------|----------|
| Sync/store | `data/` | Permanent |
| Quick look | stdout | Seconds |
| Copy-paste | stdout → `pbcopy` or `quick-view` | Minutes |
| Save for later | `exports/` with timestamp | Permanent |

**Rule: Never auto-create files for ephemeral output.** Stdout-first, save only when explicit.

## Directory Structure

```
tg-ingest/
├── data/
│   ├── dms/              # Synced DM exports (permanent)
│   │   ├── {username}.jsonl
│   │   └── {username}.jsonl.idx
│   ├── groups/           # Synced group exports (permanent)
│   ├── registry.json     # Group config (permanent)
│   ├── decisions.jsonl   # Thread state (permanent)
│   └── session.session   # Telethon auth (permanent)
├── contacts/             # Contact database (permanent)
└── exports/              # Intentional saves (user-managed)
    └── {username}_{YYYY-MM-DD}.md
```

## Naming Conventions

### Synced Data (Permanent)
```
data/dms/{username}.jsonl           # klutch_trades.jsonl
data/dms/{username}.jsonl.idx       # Index, regenerable
data/groups/{slug}.jsonl            # crypto_trenches.jsonl
```

### Intentional Exports (Timestamped)
```
exports/{username}_{YYYY-MM-DD}.md           # Daily snapshot
exports/{username}_{YYYY-MM-DD_HH-MM}.md     # Multiple per day
```

## Quick Export Workflow

Default: stdout (no files created). Compose with unix pipes:

```bash
# View in terminal
python scripts/quick_export.py klutch

# Copy to clipboard
python scripts/quick_export.py klutch | pbcopy

# Visual copy in browser
python scripts/quick_export.py klutch | quick-view

# Intentional save
python scripts/quick_export.py klutch --save
# → exports/klutch_2026-01-02.md
```

## Data Sources

| Source | Location | Use For |
|--------|----------|---------|
| Synced data | `data/dms/*.jsonl` | Reading, filtering, analysis |
| Live API | `dump-dm` command | Initial exports, fresh pulls |

**Always prefer synced data** for reading messages. It's up-to-date from `sync-all` or `live` commands.
