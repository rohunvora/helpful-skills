# Telegram Contacts & Scoring

## Contact Database

Location: `/Users/satoshi/data/tg-ingest/contacts/`

Initialize from DM exports:
```bash
poetry run tg_export contacts-init --dm-dir data/dms
```

## Lookup by Name

```bash
# Show contact details
poetry run tg_export contacts-show vibhu

# Search contacts
poetry run tg_export contacts-list --limit 50

# Filter by tag
poetry run tg_export contacts-list --tag founder
```

## Priority Scoring

Contacts are scored on a 100-point scale across 4 dimensions:

| Dimension | Max Points | Factors |
|-----------|------------|---------|
| **Engagement** | 30 | Message count, reply rate, you_replied |
| **Recency** | 25 | Days since last message |
| **Social** | 25 | Verified, premium, follower signals |
| **History** | 20 | Conversation depth, first_seen age |

### Tiers

| Tier | Score Range | Icon |
|------|-------------|------|
| High | 70-100 | 🔥 |
| Medium | 40-69 | ⚡ |
| Low | 0-39 | 💤 |

### Run Scoring

```bash
# Score all contacts and update tiers
poetry run tg_export contacts-score

# List by tier
poetry run tg_export contacts-list --tier high
```

## Contact Fields

```json
{
  "telegram_id": 123456789,
  "telegram_username": "vibhu",
  "display_name": "Vibhu Norby",
  "is_bot": false,
  "is_verified": false,
  "is_premium": true,
  "message_count": 150,
  "inbound_count": 80,
  "outbound_count": 70,
  "you_replied": true,
  "reply_rate": 0.85,
  "avg_response_time_hours": 2.5,
  "first_seen": "2024-01-15",
  "last_message": "2024-12-30",
  "priority_tier": "high",
  "sender_score": 78.5,
  "tags": ["founder", "crypto"],
  "notes": "Met at conference"
}
```

## Tagging

```bash
# Add tag
poetry run tg_export contacts-tag vibhu founder

# Remove tag
poetry run tg_export contacts-tag vibhu founder --remove

# List by tag
poetry run tg_export contacts-list --tag founder
```

## Enrichment

Contacts can be enriched with external data:
- Twitter handle and followers
- Wallet addresses
- On-chain score

Enrichment data stored in `contact.enrichment` field.
