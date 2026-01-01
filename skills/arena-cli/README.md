# arena-cli

CLI tools for [Are.na](https://are.na): export blocks, enrich with vision AI, generate browsable views.

## Features

- **Incremental export** — Fetch blocks from your Are.na channels, only new ones on subsequent runs
- **Vision AI enrichment** — Generate titles, descriptions, tags, and UI patterns using Gemini
- **Browsable views** — HTML gallery with search, filter, and lightbox
- **Visual search** — Search enriched blocks and select matches visually

## Setup

```bash
# Required environment variables
echo "ARENA_TOKEN=your_token_here" >> .env
echo "ARENA_USER_SLUG=your_username" >> .env
echo "GEMINI_API_KEY=your_key_here" >> .env
```

Get your Are.na token from: https://dev.are.na/oauth/applications

## Commands

### Export Blocks

```bash
npx ts-node scripts/export-blocks.ts              # Export all channels
npx ts-node scripts/export-blocks.ts --channel=X  # Specific channel
npx ts-node scripts/export-blocks.ts --images     # Download images locally
```

Output: `arena-export/blocks/{id}.json`

### Enrich with Vision AI

```bash
npx ts-node scripts/enrich-blocks.ts              # Enrich all image blocks
npx ts-node scripts/enrich-blocks.ts --channel=X  # Specific channel
npx ts-node scripts/enrich-blocks.ts --dry-run    # Preview without saving
npx ts-node scripts/enrich-blocks.ts --force      # Re-enrich already processed
```

Adds to each block:
- `vision.suggested_title` — Clean, descriptive title
- `vision.description` — What's notable about the image
- `vision.tags` — Searchable keywords
- `vision.ui_patterns` — UI component patterns detected

### Generate View

```bash
node scripts/gen-view.cjs                         # Generate HTML gallery
node scripts/gen-view.cjs --open                  # Generate and open
```

Output: `arena-export/view.html`

### Visual Search with Selection

For searching and validating results visually:

```bash
# Ad-hoc search
node scripts/gen-search-view.cjs "dashboard,metric-cards" --open

# Multiple pattern groups
node scripts/gen-search-view.cjs "avatar" "progress-bar" --open

# From config file with selection mode
node scripts/gen-search-view.cjs --config=searches.json --select --open
```

Config file format:
```json
[
  { "name": "Dashboards", "patterns": ["dashboard", "metric-cards"] },
  { "name": "Progress", "patterns": ["progress-bar", "progress-percentage"] }
]
```

**Selection mode** (`--select`):
- Checkboxes on each card
- Click image to zoom (lightbox)
- Floating panel with copy-able JSON output
- Output grouped by category for structured feedback

Output format:
```json
{
  "_context": "Gap references selected from Are.na",
  "selections": {
    "Dashboards": [{ "id": 123, "title": "Dark Trading Dashboard" }],
    "Progress": [{ "id": 456, "title": "Mobile Energy App" }]
  }
}
```

## Block Schema

```json
{
  "id": 12345,
  "title": "original-filename.png",
  "class": "Image",
  "image_url": "https://...",
  "channels": ["ui-ux-abc"],
  "vision": {
    "suggested_title": "Dark Trading Dashboard",
    "description": "Crypto dashboard with real-time charts",
    "tags": ["dashboard", "dark-mode", "trading"],
    "ui_patterns": ["metric-cards", "time-series-chart"]
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ARENA_TOKEN` | Yes | Are.na API token |
| `ARENA_USER_SLUG` | Yes | Your Are.na username |
| `GEMINI_API_KEY` | Yes | Google AI API key |
| `ARENA_EXPORT_DIR` | No | Export path (default: ./arena-export) |

## Customization

Edit `references/enrichment-prompt.md` to customize the vision AI prompt for different use cases (UI/UX, code screenshots, marketing, art, etc.).
