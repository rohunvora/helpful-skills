# Changelog

All notable changes to these skills are documented here.

---

## 2025-01-01

### arena-cli

**Created:** CLI tools for Are.na block management with vision AI enrichment.

**Scripts:**

| Script | Purpose |
|--------|---------|
| `export-blocks.ts` | Incremental block export from Are.na channels |
| `enrich-blocks.ts` | Vision AI enrichment with Gemini (titles, tags, patterns) |
| `gen-view.cjs` | HTML gallery with search and lightbox |
| `gen-search-view.cjs` | Visual search results with selection mode |

**Selection mode:** Visual feedback workflow—checkboxes on image cards, copy-able JSON output grouped by category. Enables "visual AskUserQuestion" pattern for validating search results.

**Output format:**
```json
{
  "_context": "Gap references selected from Are.na",
  "selections": {
    "Category": [{ "id": 123, "title": "Title" }]
  }
}
```

**Uses:** incremental-fetch pattern for robust API fetching.

---

## 2024-12-31

### HTML Skills Architecture

Designed and implemented a layered architecture for HTML-related skills.

**Decision:** Keep as 3 separate skills (not monolithic) for context efficiency.

```
Layer 1: Structure/UX     →  quick-view, table-filters
Layer 2: Styling          →  html-style
```

**Key insight:** Don't load styling tokens when just figuring out data structure.

**Changes made:**

| Skill | Change |
|-------|--------|
| quick-view | Added styling handoff section, documented class names |
| table-filters | Added HTML class reference, styling handoff |
| html-style | Added compatibility section for quick-view + table-filters |
| base.css | Added styles for `.type-*`, `.filter-*`, `.chip`, etc. |

**Composition model:** Explicit handoff—each Layer 1 skill ends with "invoke html-style for styling."

See `logs/HTML_SKILLS_ARCHITECTURE.md` for full architecture documentation.

---

### quick-view

**Created:** Skill for generating minimal HTML to review Claude Code output in browser.

**Patterns defined:**
- List of items
- Tables
- Expandable sections (with truncation)
- Type-differentiated items (user/draft/done)
- Sourced data with attribution
- Editable drafts with diff tracking

**Output:** `_private/views/{name}.html`

---

### table-filters

**Created:** Skill for designing filter UX patterns.

**Filter types:**
- Contains (text search)
- Checkboxes (fixed values)
- Range (numeric)
- Date range

**Class conventions defined:** `.filter-bar`, `.chip`, `.filter-menu`, etc.

---

### html-style

**Created:** Skill for applying opinionated styling to HTML.

**Features:**
- Status indicators (`.stale`, `.warm`, `.pending`)
- Trends (`.trend-up`, `.trend-down`)
- Status pills, tags, section headers
- Dark mode support
- Compatibility with quick-view and table-filters classes

**Resources:**
- `assets/base.css` - Full stylesheet
- `references/style-guide.md` - Detailed patterns

---

### incremental-fetch

**Created:** Skill for building resilient API data pipelines.

**Core pattern:** Two-watermark system for bidirectional fetching.

| Watermark | Purpose |
|-----------|---------|
| `newest_id` | Fetch new data |
| `oldest_id` | Backfill old data |

**Key rules:**
- Save records after each page (resilience)
- Save watermarks once at end (correctness)

---

### Skill Consolidation

**Moved:** All skills consolidated to `~/.claude/skills/` for cross-project availability.

**Added:** README.md for each skill.
