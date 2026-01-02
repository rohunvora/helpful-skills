#!/usr/bin/env python3
"""
Quick export: filter + markdown format for AI context.

Usage:
    python scripts/quick_export.py "+14155551234"           # stdout, last 24h
    python scripts/quick_export.py "John Doe" --hours 48    # last 48h
    python scripts/quick_export.py "+14155551234" | pbcopy  # clipboard
    python scripts/quick_export.py "+14155551234" | quick-view # browser
    python scripts/quick_export.py "+14155551234" --save    # exports/{id}_{date}.md
"""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Tuple

# Paths relative to imsg-ingest repo
REPO_ROOT = Path("/Users/satoshi/data/imsg-ingest")
CONVERSATIONS_DIR = REPO_ROOT / "data/conversations"
EXPORTS_DIR = REPO_ROOT / "exports"


def parse_date(d: str) -> datetime:
    """Handle various date formats from exports."""
    d = d.rstrip('Z').replace('+00:00Z', '+00:00')
    if '+' not in d and '-' not in d[-6:]:
        d += '+00:00'
    return datetime.fromisoformat(d)


def sync_messages():
    """Quick sync to get latest messages."""
    print("Syncing latest messages...", file=sys.stderr)
    subprocess.run(
        [sys.executable, "-m", "imessage_export.cli", "sync"],
        capture_output=True,
        cwd=REPO_ROOT
    )


def find_jsonl(identifier: str) -> Tuple[Optional[Path], str]:
    """Find JSONL file for identifier (phone, email, or name). Returns (path, display_name)."""

    # Normalize phone number for matching
    normalized = identifier.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    for f in CONVERSATIONS_DIR.glob("*.jsonl"):
        stem = f.stem
        # Direct match
        if identifier.lower() == stem.lower():
            return f, stem
        if normalized == stem.replace(" ", "").replace("-", ""):
            return f, stem
        # Partial match
        if identifier.lower() in stem.lower():
            return f, stem

    return None, identifier


def quick_export(identifier: str, hours: int = 24, skip_sync: bool = False) -> Optional[str]:
    """Sync, filter, and format as markdown."""

    jsonl_path, display_name = find_jsonl(identifier)
    if not jsonl_path:
        print(f"No synced data for '{identifier}'", file=sys.stderr)
        convos = list(CONVERSATIONS_DIR.glob("*.jsonl"))[:10]
        if convos:
            print(f"Available: {', '.join(f.stem for f in sorted(convos))}", file=sys.stderr)
        return None

    # Sync first (unless skipped)
    if not skip_sync:
        sync_messages()

    # Load and filter
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    with open(jsonl_path) as f:
        msgs = [json.loads(line) for line in f if line.strip()]

    recent = [m for m in msgs if parse_date(m['date']) > cutoff]

    if not recent:
        return f"No messages in last {hours}h with {display_name}"

    # Try to get a better display name from messages
    for m in recent:
        if not m.get('is_from_me') and m.get('sender_username'):
            display_name = m['sender_username']
            break

    # Format as markdown transcript
    lines = [f"## Chat with {display_name} (last {hours}h)", ""]

    for m in recent:
        dt = parse_date(m['date'])
        time_str = dt.strftime("%H:%M")
        is_from_me = m.get('is_from_me', False)
        sender = "you" if is_from_me else display_name
        text = m.get('text', '') or '[media]'
        # Handle multiline messages
        text = text.replace('\n', '\n    ')
        lines.append(f"[{time_str}] **{sender}**: {text}")

    return "\n".join(lines)


def save_export(content: str, identifier: str) -> Path:
    """Save to exports/ with timestamp."""
    EXPORTS_DIR.mkdir(exist_ok=True)

    # Sanitize identifier for filename
    safe_id = identifier.replace("+", "").replace(" ", "_").replace("@", "")
    date_str = datetime.now().strftime("%Y-%m-%d")
    output_path = EXPORTS_DIR / f"{safe_id}_{date_str}.md"

    # If exists, add time
    if output_path.exists():
        time_str = datetime.now().strftime("%H-%M")
        output_path = EXPORTS_DIR / f"{safe_id}_{date_str}_{time_str}.md"

    output_path.write_text(content)
    return output_path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Quick export iMessage conversations for AI context")
    parser.add_argument("identifier", help="Phone number, email, or contact name")
    parser.add_argument("--hours", type=int, default=24, help="Hours to look back (default: 24)")
    parser.add_argument("--no-sync", action="store_true", help="Skip sync, use cached data")
    parser.add_argument("--save", action="store_true", help="Save to exports/ instead of stdout")
    args = parser.parse_args()

    result = quick_export(args.identifier, args.hours, args.no_sync)

    if result:
        if args.save:
            path = save_export(result, args.identifier)
            print(f"Saved to {path}", file=sys.stderr)
        else:
            print(result)


if __name__ == "__main__":
    main()
