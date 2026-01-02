# Full Disk Access Setup

iMessage data lives in `~/Library/Messages/chat.db`, which requires Full Disk Access to read.

## Grant Full Disk Access

1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** → **Full Disk Access**
3. Click the **+** button
4. Add your terminal app:
   - **Terminal.app** (`/Applications/Utilities/Terminal.app`)
   - **iTerm.app** (`/Applications/iTerm.app`)
   - **VS Code** (`/Applications/Visual Studio Code.app`)
   - Or whichever terminal you use
5. **Restart the terminal app** (quit and reopen)

## Verify Access

```bash
cd /Users/satoshi/data/imsg-ingest
poetry run imsg status
```

Expected output:
```
✓ Database accessible
  Messages: 50,000
  Chats: 150
  Contacts: 200
✓ Contacts: 200 identifiers via sqlite
```

## Troubleshooting

### "Cannot access iMessage database"

1. Confirm Full Disk Access is granted (check System Settings)
2. **Restart the terminal** after granting access
3. Try running from Terminal.app instead of IDE terminal

### "No contact source available"

Contact resolution has two backends:
1. **pyobjc** - macOS Contacts framework (preferred)
2. **SQLite** - Direct AddressBook database access

If neither works:
```bash
# Check which backends are available
poetry run imsg contacts status
```

### Database Location

Default: `~/Library/Messages/chat.db`

To verify it exists:
```bash
ls -la ~/Library/Messages/chat.db
```

If missing, iMessage may not be set up on this Mac.

## Claude Code Considerations

When running via Claude Code:
- The **Claude Code terminal process** needs Full Disk Access
- This may be the VS Code terminal, not standalone Terminal.app
- Grant access to the specific app running Claude Code
