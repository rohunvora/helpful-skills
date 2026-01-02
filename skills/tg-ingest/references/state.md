# Thread State Management

## State Storage

Thread states are stored in `/Users/satoshi/data/tg-ingest/data/decisions.jsonl`.

Each line is a JSON object keyed by thread_id:
```json
{"thread_id": "tg:dm:vibhu", "status": "pending", "draft": null, "note": null, "snooze": null, "updated_at": "2024-12-30T10:00:00Z"}
{"thread_id": "tg:dm:malcolm", "status": "done", "draft": null, "note": "Closed deal", "snooze": null, "updated_at": "2024-12-30T11:00:00Z"}
{"thread_id": "tg:group:crypto_trenches", "status": "archived", "draft": null, "note": null, "snooze": null, "updated_at": "2024-12-29T15:00:00Z"}
```

## Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Needs attention (default) |
| `done` | Handled, no action needed |
| `archived` | Hidden from inbox |

## State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `thread_id` | string | Canonical ID (`tg:dm:username` or `tg:group:slug`) |
| `status` | string | pending/done/archived |
| `draft` | string | Draft reply text |
| `note` | string | Personal note about thread |
| `snooze` | ISO8601 | Snooze until datetime |
| `updated_at` | ISO8601 | Last state change |

## Thread ID Format

```
tg:dm:username     - DM with @username
tg:group:slug      - Group chat by registry slug
```

Examples:
- `tg:dm:vibhu`
- `tg:dm:threadguy`
- `tg:group:crypto_trenches`
- `tg:group:founders_chat`

## Operations

### Mark as Done

Set status to `done` to remove from pending inbox:

```python
# In decisions.jsonl
{"thread_id": "tg:dm:vibhu", "status": "done", ...}
```

### Snooze Until

Hide thread until specified time:

```python
{"thread_id": "tg:dm:vibhu", "status": "pending", "snooze": "2024-12-31T09:00:00Z", ...}
```

Thread reappears in inbox after snooze time passes.

### Save Draft

Store draft reply for later:

```python
{"thread_id": "tg:dm:vibhu", "status": "pending", "draft": "Will send proposal tomorrow", ...}
```

### Add Note

Personal context about thread:

```python
{"thread_id": "tg:dm:vibhu", "status": "pending", "note": "Waiting for their response on deal", ...}
```

## Querying State

When listing pending threads, filter by:
1. `status` != "done" AND `status` != "archived"
2. `snooze` is null OR `snooze` < now

## Integration with unified-messages

The unified-messages router reads/writes this file when handling telegram threads. State ownership remains with tg-ingest.
