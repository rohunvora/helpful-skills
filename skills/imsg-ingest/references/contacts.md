# iMessage Contact Resolution

## Overview

iMessage identifies contacts by phone number or email. Contact resolution maps these to human-readable names.

## Backends

Two resolution backends, checked in order:

### 1. pyobjc (Preferred)

Uses macOS Contacts framework via Python bindings.

```bash
# Check if available
poetry run imsg contacts status
```

Requires:
- `pyobjc-framework-Contacts` package
- Contacts access permission (granted automatically on first use)

### 2. SQLite (Fallback)

Reads directly from AddressBook database:
```
~/Library/Application Support/AddressBook/Sources/*/AddressBook-v22.abcddb
```

Requires Full Disk Access.

## Check Status

```bash
poetry run imsg contacts status
```

Output:
```
=== Contact Resolution ===
  Available: True
  Backend: sqlite
  Contacts loaded: 1,234
  pyobjc: ✗ not installed
  SQLite: ✓ available
  DB: ~/Library/Application Support/AddressBook/...
```

## Lookup

```bash
# By phone number
poetry run imsg contacts lookup "+14155551234"
# Output: +14155551234 → John Doe

# By email
poetry run imsg contacts lookup "john@example.com"
# Output: john@example.com → John Doe
```

## List Contacts

```bash
# All contacts
poetry run imsg contacts list

# Filter by name
poetry run imsg contacts list --search "john"

# Limit results
poetry run imsg contacts list --limit 20
```

## Refresh Cache

After adding/updating contacts on your phone or Mac:

```bash
poetry run imsg contacts sync
```

This clears the cache and reloads from source.

## Update Existing Exports

If you exported conversations before setting up contacts, update them:

```bash
# Preview changes
poetry run imsg contacts refresh-exports --dry-run

# Apply changes
poetry run imsg contacts refresh-exports
```

This updates `sender_username` fields in existing JSONL exports.

## Contact Data Format

Internally, contacts map identifier → name:

```python
{
    "+14155551234": "John Doe",
    "+14155559876": "John Doe",      # Same person, multiple phones
    "john@example.com": "John Doe",
    "jane@work.com": "Jane Smith"
}
```

## Phone Number Normalization

Phone numbers are normalized for matching:
- `+1 (415) 555-1234` → `+14155551234`
- `415-555-1234` → `+14155551234` (assumes US)
- International numbers preserved with country code
