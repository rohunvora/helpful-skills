# Telegram Group Management

## Registry

Groups are tracked in `/Users/satoshi/data/tg-ingest/data/registry.json`.

```json
{
  "groups": {
    "crypto_trenches": {
      "id": -1001234567890,
      "name": "Crypto Trenches",
      "type": "trading",
      "members": 500,
      "sync": true,
      "last_activity": "2024-12-30"
    }
  }
}
```

## List Groups

```bash
# All groups
poetry run tg_export groups list

# Trading groups only
poetry run tg_export groups list --trading

# Active in last 7 days
poetry run tg_export groups list --active 7

# JSON output
poetry run tg_export groups list --json
```

## Add a Group

```bash
# By name (searches dialogs)
poetry run tg_export groups add "crypto trenches" --type trading

# By chat ID
poetry run tg_export groups add -1001234567890 --type trading

# Custom slug
poetry run tg_export groups add "Crypto Trenches" --slug ct --type trading

# Add but don't auto-sync
poetry run tg_export groups add "archive group" --no-sync
```

### Group Types

- `trading` - Trading/alpha groups (sorted first)
- `business` - Business/work groups

## Sync Groups

Only groups with `sync: true` are included in sync operations.

```bash
# Sync all whitelisted groups
poetry run tg_export groups sync

# Trading groups only
poetry run tg_export groups sync --trading-only

# Backfill mode (older messages)
poetry run tg_export groups sync --backfill

# Dry run
poetry run tg_export groups sync --dry-run
```

## Backfill History

Fetch older messages for a specific group:

```bash
# Single group
poetry run tg_export groups backfill crypto_trenches

# With limit
poetry run tg_export groups backfill crypto_trenches --limit 1000

# All active groups
poetry run tg_export groups backfill --active 30

# All groups
poetry run tg_export groups backfill --all
```

## Remove a Group

```bash
# Remove from registry (keep data)
poetry run tg_export groups remove crypto_trenches

# Remove and delete data
poetry run tg_export groups remove crypto_trenches --delete-data

# Skip confirmation
poetry run tg_export groups remove crypto_trenches --force
```

## Show Group Details

```bash
poetry run tg_export groups show crypto_trenches
```

Output:
```
Name: Crypto Trenches
Slug: crypto_trenches
Chat ID: -1001234567890
Type: trading
Members: 500
Last Activity: 2024-12-30
Sync: enabled

Exported:
  Messages: 15,432
  File: data/groups/crypto_trenches.jsonl (12.5 MB)
  Last msg ID: 98765
  Oldest msg ID: 1234
```

## Data Files

| File | Purpose |
|------|---------|
| `data/groups/{slug}.jsonl` | Message exports |
| `data/groups/{slug}.jsonl.idx` | Index for incremental sync |
| `data/registry.json` | Group registry |
