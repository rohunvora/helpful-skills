# Unified CLI Commands

Cross-platform aggregator commands. For platform-specific commands, see:
- **tg-ingest skill** for Telegram operations
- **imsg-ingest skill** for iMessage operations

## unified-messages CLI

Working directory: `/Users/satoshi/data/unified-messages`

```bash
python -m unified.cli <command>
```

### sync

```bash
python -m unified.cli sync [OPTIONS]
```

Sync messages from both Telegram and iMessage.

Options:
- `--backfill` - Fetch older messages instead of newer
- `--tg-only` - Only sync Telegram
- `--imsg-only` - Only sync iMessage

### status

```bash
python -m unified.cli status [OPTIONS]
```

Show sync status for both platforms.

Options:
- `--detailed, -d` - Show conversation-level details

### list

```bash
python -m unified.cli list [OPTIONS]
```

List pending threads across both platforms.

Options:
- `--limit, -n` - Maximum threads to show (default: 20)
- `--json` - Output as JSON

### generate

```bash
python -m unified.cli generate
```

Generate triage prompt for Claude. Outputs to `output/prompt.md`.

### render

```bash
python -m unified.cli render <RESPONSE_FILE>
```

Render Claude's triage response to HTML. Opens in browser.
