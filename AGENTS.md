# Agent Reference

Quick reference for AI agents using these skills.

## Skill Index

| Skill | Trigger Phrases | Output |
|-------|-----------------|--------|
| `quick-view` | "show me", "view this", "quick view" | `_private/views/*.html` |
| `table-filters` | "add filters", "filter this table" | HTML with filter classes |
| `html-style` | "style this", "make it look good" | Styled HTML with CSS |
| `incremental-fetch` | "ingest from API", "backfill data" | Data pipeline scripts |

---

## Composition Patterns

### HTML Generation Flow

```
User: "show me the data"
         ↓
    quick-view  ──→  semantic HTML (minimal styling)
         ↓
    [optional]
         ↓
    html-style  ──→  fully styled HTML
```

### When to Chain Skills

| If user says... | Use |
|-----------------|-----|
| "show me" | quick-view only |
| "show me and make it pretty" | quick-view → html-style |
| "build a filterable table" | quick-view + table-filters |
| "styled filterable table" | quick-view + table-filters → html-style |

---

## Class Compatibility

### quick-view outputs these classes:

```
.type-user    → user input (blue border)
.type-draft   → draft content (orange border)
.type-done    → completed (green border)
.source       → attribution link
.meta         → metadata header
.truncate     → long content container
```

### table-filters outputs these classes:

```
.filter-bar   → container
.filter-chips → chip container
.chip         → individual filter chip
.filter-menu  → dropdown panel
.empty-state  → no results
```

### html-style recognizes all above + adds:

```
.stale / .warm / .pending  → status text
.trend-up / .trend-down    → trends with arrows
.status-success / .status-error / .status-pending  → pills
.section-header            → dark bar divider
```

---

## File Locations

```
skills/
├── quick-view/SKILL.md       # HTML generation
├── table-filters/SKILL.md    # Filter UX patterns
├── html-style/
│   ├── SKILL.md              # Styling rules
│   ├── assets/base.css       # Inject this CSS
│   └── references/style-guide.md
└── incremental-fetch/
    ├── SKILL.md              # Pipeline patterns
    └── references/patterns.md # Code examples
```

---

## Installation

Copy any skill folder to `~/.claude/skills/` for cross-project use:

```bash
cp -r skills/quick-view ~/.claude/skills/
```

Or to a specific project:

```bash
cp -r skills/quick-view /path/to/project/.claude/skills/
```
