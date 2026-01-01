# quick-view

Generate minimal HTML pages to review Claude Code output in a browser.

## When to Use

- Terminal output is hard to read
- Reviewing lists, tables, drafts, summaries
- User says: "show me", "view this", "quick view"

## What It Does

1. Identifies data to display
2. Chooses pattern (list, table, expandable sections)
3. Generates semantic HTML
4. Writes to `_private/views/{name}.html`
5. Opens in browser

## Styling

Output is functional but minimal. For full styling, invoke `html-style` after.
