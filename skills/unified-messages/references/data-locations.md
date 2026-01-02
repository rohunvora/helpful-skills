# Unified Data Locations

Cross-platform aggregator data. For platform-specific data, see:
- **tg-ingest skill** for Telegram data locations
- **imsg-ingest skill** for iMessage data locations

## unified-messages

**Base**: `/Users/satoshi/data/unified-messages`

| Path | Purpose |
|------|---------|
| `data/contacts.json` | Person registry (aliases, thread mappings) |
| `output/prompt.md` | Generated triage prompt |
| `output/triage.html` | Rendered triage output |

### contacts.json Format (Person Registry)

Maps person slugs to their threads across platforms:

```json
{
  "people": {
    "vibhu": {
      "display_name": "Vibhu Norby",
      "thread_ids": ["tg:dm:vibhu", "imsg:dm:+14155551234"],
      "primary": "tg:dm:vibhu",
      "aliases": ["v", "vn"],
      "notes": "Founder of X"
    }
  }
}
```

## Platform Data (Aggregated From)

unified-messages reads from these platform repos:

| Platform | Base Path | State File |
|----------|-----------|------------|
| Telegram | `/Users/satoshi/data/tg-ingest` | `data/decisions.jsonl` |
| iMessage | `/Users/satoshi/data/imsg-ingest` | `data/context/state.json` |

## Environment Variables

```bash
TG_INGEST_PATH=/Users/satoshi/data/tg-ingest
IMSG_INGEST_PATH=/Users/satoshi/data/imsg-ingest
```
