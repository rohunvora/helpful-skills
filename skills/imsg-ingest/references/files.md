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
imsg-ingest/
├── data/
│   ├── conversations/        # Synced conversations (permanent)
│   │   └── {chat_id}.jsonl
│   ├── sync-state.json       # Sync state (permanent)
│   └── context/
│       └── state.json        # Thread state (permanent)
└── exports/                  # Intentional saves (user-managed)
    └── {identifier}_{YYYY-MM-DD}.md
```

## Naming Conventions

### Synced Data (Permanent)
```
data/conversations/{chat_id}.jsonl    # +14155551234.jsonl
data/conversations/{email}.jsonl      # john@example.com.jsonl
```

### Intentional Exports (Timestamped)
```
exports/{identifier}_{YYYY-MM-DD}.md           # Daily snapshot
exports/{identifier}_{YYYY-MM-DD_HH-MM}.md     # Multiple per day
```

Identifiers are sanitized: `+14155551234` → `14155551234_2026-01-02.md`

## Quick Export Workflow

Default: stdout (no files created). Compose with unix pipes:

```bash
# View in terminal
python scripts/quick_export.py "+14155551234"

# Copy to clipboard
python scripts/quick_export.py "John Doe" | pbcopy

# Visual copy in browser
python scripts/quick_export.py "+14155551234" | quick-view

# Intentional save
python scripts/quick_export.py "+14155551234" --save
# → exports/14155551234_2026-01-02.md
```

## Source Database

iMessage data is read from:
```
~/Library/Messages/chat.db
```

This is read-only. Synced data in `data/conversations/` is the working copy.
