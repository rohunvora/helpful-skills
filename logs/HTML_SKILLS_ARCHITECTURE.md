# HTML Skills Architecture Plan

## The Three Skills

| Skill | Job | When Loaded |
|-------|-----|-------------|
| `quick-view` | Present data in semantic HTML | "show me", "view this", reviewing output |
| `table-filters` | Design filter UX for tables | "add filters", building filterable tables |
| `html-style` | Apply visual styling to HTML | "style this", "make it look good" |

**Philosophy:** Small skills that do one job well. Compose through explicit handoff.

---

## Architecture: Layered with Explicit Handoff

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST                              │
│         "show me the drafts" / "build a data table"         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: STRUCTURE & UX                                    │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │  quick-view  │    │table-filters │                       │
│  │              │    │              │                       │
│  │ • What data  │    │ • Filter UX  │                       │
│  │ • What layout│    │ • Chip logic │                       │
│  │ • Semantic   │    │ • Range/date │                       │
│  │   elements   │    │   patterns   │                       │
│  └──────────────┘    └──────────────┘                       │
│                                                              │
│  OUTPUT: Unstyled semantic HTML with styling-ready classes  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ EXPLICIT HANDOFF
                              │ "To apply styling, invoke html-style"
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: STYLING                                           │
│  ┌────────────────────────────────────────────┐             │
│  │              html-style                     │             │
│  │                                             │             │
│  │ • Injects base.css                         │             │
│  │ • Applies classes (.stale, .trend-up, etc) │             │
│  │ • Adds interactive JS                      │             │
│  │ • Dark mode handling                       │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  OUTPUT: Fully styled HTML ready for browser                │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Decisions

### 1. Keep Skills Separate (Not Monolithic)

**Why:**
- Context efficiency: Don't load styling tokens when figuring out structure
- Reusability: html-style works on any HTML (scraped, imported, html-tools output)
- Single responsibility: Each skill has one job

### 2. html-style Owns the Contract

**The contract = class names and semantic patterns**

html-style defines:
- `.stale`, `.warm`, `.pending` for status
- `.trend-up`, `.trend-down` for trends
- `.tag-*`, `.status-*` for pills
- `<details>` + `<summary>` for collapsible
- Data attributes (`data-thread-id`, etc.) for JS

quick-view and table-filters output HTML that **uses these conventions** but don't define them.

### 3. Explicit Handoff in Skill Output

At the end of quick-view and table-filters, add:

```markdown
## Styling

This output uses semantic HTML ready for styling.
To apply visual styling, invoke the `html-style` skill.
```

This tells Claude explicitly: "I'm done with structure, now chain to styling if needed."

---

## Changes Required

### quick-view

**Add at end of SKILL.md:**
```markdown
## Styling Handoff

Output is unstyled semantic HTML with:
- Semantic elements: `<table>`, `<details>`, `<ul>`
- Status classes: `.type-user`, `.type-draft`, `.type-done`
- Data attributes: `data-original`, `data-username`

To apply full styling, invoke the `html-style` skill after generating.
```

**Ensure HTML patterns use html-style conventions:**
- Use `.type-*` that html-style can map to its status classes
- Use `<details>`/`<summary>` (html-style expects this)
- Include `data-*` attributes for JS hooks

### table-filters

**Add at end of SKILL.md:**
```markdown
## Styling Handoff

Filter HTML uses semantic markup ready for styling:
- Chip container: `<div class="filter-chips">`
- Individual chips: `<span class="chip" data-column="...">`
- Filter menus: `<div class="filter-menu">`

To apply full styling, invoke the `html-style` skill after generating.
```

**Add expected class names to patterns** (currently just ASCII diagrams).

### html-style

**Add section for Layer 1 compatibility:**
```markdown
## Compatibility with Structure Skills

When styling output from `quick-view` or `table-filters`:

| Their Class | Maps To |
|-------------|---------|
| `.type-user` | `.status-pending` |
| `.type-draft` | `.status-pending` (orange) |
| `.type-done` | `.status-success` |
| `.chip` | Filter chip styling |
| `.filter-chips` | Chip container |

The base.css includes these mappings automatically.
```

---

## Skill Locations

**Recommendation:** Consolidate to one location.

| Current | Recommended |
|---------|-------------|
| quick-view in project | Move to `~/.claude/skills/` |
| table-filters in user | Keep in `~/.claude/skills/` |
| html-style in user | Keep in `~/.claude/skills/` |

**Rationale:** These are general-purpose skills, not project-specific. User skills (`~/.claude/skills/`) are available across all projects.

---

## What Each Skill Does (Detailed)

### quick-view

**Scope:** Semantic HTML generation for reviewing data in browser.

**Decisions it makes:**
- Element choice: `<table>` vs `<ul>` vs `<details>` vs `<pre>`
- Layout structure: columns, groupings, sections
- Content handling: truncation thresholds, expandable sections
- Interactivity: editable drafts, copy buttons, source attribution
- Output location: `_private/views/{name}.html`

**What it produces:**
- Functional HTML with minimal CSS (dark/light mode only)
- Uses semantic elements that html-style can later enhance
- Opens in browser immediately

**Example flow:**
```
User: "show me the drafts"
      ↓
quick-view reads draft data
      ↓
Decides: long content → use <details> with truncation
      ↓
Generates: <details><summary>@user</summary><pre>content</pre></details>
      ↓
Writes to _private/views/drafts.html
      ↓
Opens in browser (functional but visually basic)
```

### table-filters

**Scope:** UX patterns specifically for table filtering.

**Decisions it makes:**
- Filter type per column (text/checkbox/range/date)
- Chip design and truncation
- Menu layout (above field, dropdown positioning)
- Empty state handling

**What it produces:**
- HTML structure for filter UI
- Class names that html-style can style
- UX logic (not visual styling)

**When to use:**
- Building a data table that needs user-controlled filtering
- Claude struggles with filter UX without this guidance

### html-style

**Scope:** Visual styling for any HTML.

**Decisions it makes:**
- Which classes to apply (status, trends, tags)
- Color coding (positive/negative, stale/warm)
- Dark mode handling
- Interactive JS (copy buttons, draft saving)

**What it produces:**
- Styled HTML with injected CSS
- Interactive behavior

**Works on:**
- Output from quick-view
- Output from table-filters
- External HTML (scraped, imported, html-tools output)
- Any HTML that needs styling

---

## Summary

| Decision | Choice |
|----------|--------|
| Structure | Keep 3 separate skills |
| Contract owner | html-style |
| Composition | Explicit handoff (not parent coordinator) |
| Location | All in `~/.claude/skills/` |
| Changes needed | Add handoff sections + class conventions |

---

## Next Steps

1. [ ] Update quick-view with styling handoff section
2. [ ] Update quick-view patterns to use html-style-compatible classes
3. [ ] Update table-filters to output class names (not just ASCII)
4. [ ] Update table-filters with styling handoff section
5. [ ] Update html-style with compatibility mappings
6. [ ] Move quick-view to `~/.claude/skills/` (optional, consolidation)
