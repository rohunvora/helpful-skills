# Enrichment Prompt

This is the prompt sent to Gemini Vision for each image block. Customize this to change what metadata is extracted.

## Default Prompt

```
Analyze this image for a design reference library (Are.na).

Generate:
1. **suggested_title**: A clean, descriptive title (3-8 words). NOT a filename. Describe what this IS, not what it shows.
   - Good: "Dark Mode Trading Dashboard", "Mobile Onboarding Flow", "Stat Card with Progress Bars"
   - Bad: "Screenshot", "UI Design", "Image of interface"

2. **description**: 1-2 sentences describing what makes this notable as a design reference. What could someone learn from this?

3. **tags**: 5-15 lowercase tags for searching. Include:
   - Layout type: table, card, list, grid, dashboard, modal, form, nav
   - Components: avatar, button, input, stat-bar, progress, badge, tag, icon
   - Patterns: leaderboard, onboarding, settings, profile, feed, search
   - Style: dark-mode, light-mode, minimal, dense, colorful, monochrome
   - Platform: mobile, desktop, web, ios, android

4. **ui_patterns**: Specific UI patterns visible (for styling reference):
   - Examples: "inline-stats", "avatar-with-name", "tiered-ranking", "progress-percentage", "sortable-headers", "status-pills", "metric-cards"

Respond in JSON format only:
{
  "suggested_title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "ui_patterns": ["...", "..."]
}
```

## Customization

To customize for different use cases:

### For code/technical references
Add to tags section:
```
- Language: python, javascript, rust, go
- Concepts: algorithm, data-structure, architecture, api
```

### For marketing/copy references
Add to tags section:
```
- Type: headline, cta, testimonial, pricing
- Tone: playful, professional, urgent, minimal
```

### For illustration/art references
Replace ui_patterns with:
```
4. **art_patterns**: Style and technique patterns:
   - Examples: "flat-illustration", "3d-render", "hand-drawn", "gradient-mesh"
```

## Output Schema

The enrichment adds a `vision` field to each block:

```json
{
  "id": 12345,
  "title": "original-filename.png",
  "vision": {
    "suggested_title": "Dark Mode Trading Dashboard",
    "description": "A crypto trading interface with real-time charts and whale activity tracking.",
    "tags": ["dashboard", "crypto", "dark-mode", "trading", "charts"],
    "ui_patterns": ["metric-cards", "time-series-chart", "status-pills"],
    "enriched_at": "2025-01-01T00:00:00.000Z",
    "model": "gemini-2.0-flash"
  }
}
```
