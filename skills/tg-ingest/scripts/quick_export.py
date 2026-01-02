#!/usr/bin/env python3
"""
Quick export: sync + filter + markdown format for AI context.

Usage:
    python scripts/quick_export.py klutch_trades              # stdout, last 24h
    python scripts/quick_export.py klutch_trades --hours 48   # last 48h
    python scripts/quick_export.py klutch_trades | pbcopy     # clipboard
    python scripts/quick_export.py klutch_trades | quick-view # browser
    python scripts/quick_export.py klutch_trades --save       # exports/{user}_{date}.md
"""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

# Paths relative to tg-ingest repo
REPO_ROOT = Path("/Users/satoshi/data/tg-ingest")
DMS_DIR = REPO_ROOT / "data/dms"
EXPORTS_DIR = REPO_ROOT / "exports"


def parse_date(d: str) -> datetime:
    """Handle various date formats from exports."""
    d = d.rstrip('Z').replace('+00:00Z', '+00:00')
    if '+' not in d and '-' not in d[-6:]:
        d += '+00:00'
    return datetime.fromisoformat(d)


def sync_dms():
    """Quick sync to get latest messages."""
    print("Syncing latest messages...", file=sys.stderr)
    subprocess.run(
        [sys.executable, "-m", "tg_export.cli", "sync-dms", "--dir", str(DMS_DIR)],
        capture_output=True,
        cwd=REPO_ROOT
    )


def find_jsonl(username: str) -> Optional[Path]:
    """Find JSONL file for username (flexible matching)."""
    # Exact match first
    exact = DMS_DIR / f"{username}.jsonl"
    if exact.exists():
        return exact

    # Case-insensitive search
    for f in DMS_DIR.glob("*.jsonl"):
        if username.lower() in f.stem.lower():
            return f

    return None


def quick_export(username: str, hours: int = 24, skip_sync: bool = False) -> Optional[str]:
    """Sync, filter, and format as markdown."""

    jsonl_path = find_jsonl(username)
    if not jsonl_path:
        print(f"No synced data for '{username}'", file=sys.stderr)
        print(f"Available DMs: {', '.join(f.stem for f in sorted(DMS_DIR.glob('*.jsonl'))[:10])}", file=sys.stderr)
        return None

    # Sync first (unless skipped)
    if not skip_sync:
        sync_dms()

    # Load and filter
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    with open(jsonl_path) as f:
        msgs = [json.loads(line) for line in f if line.strip()]

    recent = [m for m in msgs if parse_date(m['date']) > cutoff]

    if not recent:
        return f"No messages in last {hours}h with @{jsonl_path.stem}"

    # Determine username from file
    chat_username = jsonl_path.stem

    # Format as markdown transcript
    lines = [f"## Chat with @{chat_username} (last {hours}h)", ""]

    for m in recent:
        dt = parse_date(m['date'])
        time_str = dt.strftime("%H:%M")
        # Determine sender
        is_outgoing = m.get('is_outgoing', False)
        sender_username = m.get('sender_username', '')
        if is_outgoing or sender_username == 'frankdegods':
            sender = "you"
        else:
            sender = chat_username
        text = m.get('text', '') or '[media]'
        # Handle multiline messages
        text = text.replace('\n', '\n    ')
        lines.append(f"[{time_str}] **{sender}**: {text}")

    return "\n".join(lines)


def save_export(content: str, username: str) -> Path:
    """Save to exports/ with timestamp."""
    EXPORTS_DIR.mkdir(exist_ok=True)
    date_str = datetime.now().strftime("%Y-%m-%d")
    output_path = EXPORTS_DIR / f"{username}_{date_str}.md"

    # If exists, add time
    if output_path.exists():
        time_str = datetime.now().strftime("%H-%M")
        output_path = EXPORTS_DIR / f"{username}_{date_str}_{time_str}.md"

    output_path.write_text(content)
    return output_path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Quick export Telegram DMs for AI context")
    parser.add_argument("username", help="Telegram username (flexible matching)")
    parser.add_argument("--hours", type=int, default=24, help="Hours to look back (default: 24)")
    parser.add_argument("--no-sync", action="store_true", help="Skip sync, use cached data")
    parser.add_argument("--save", action="store_true", help="Save to exports/ instead of stdout")
    args = parser.parse_args()

    result = quick_export(args.username, args.hours, args.no_sync)

    if result:
        if args.save:
            path = save_export(result, args.username)
            print(f"Saved to {path}", file=sys.stderr)
        else:
            print(result)


if __name__ == "__main__":
    main()
