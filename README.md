# Cool Claude Skills

Skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that make common tasks easier.

## What's a Skill?

A skill teaches Claude how to do something specific. Instead of explaining what you want every time, the skill handles it.

## The Skills

### quick-view

**Turn terminal output into a webpage you can actually read.**

Use when:
- You're staring at a wall of JSON or logs
- You want to review a list of items visually
- You need to compare drafts side-by-side

Just say "show me this" or "make this reviewable" and Claude generates a clean HTML page and opens it in your browser.

---

### table-filters

**Add smart filters to data tables.**

Use when:
- You're building a table that users need to search/filter
- You want the right filter type for each column (text search, checkboxes, date range, etc.)

Tell Claude what data you're displaying and it figures out the best filter UX for each column.

---

### html-style

**Make HTML look good with consistent styling.**

Use when:
- You have functional HTML that needs polish
- You want dark mode, status indicators, or visual hierarchy

Works great after quick-view or table-filters to add the finishing touches.

---

### incremental-fetch

**Download data from APIs without losing progress.**

Use when:
- You're pulling data from Twitter, Are.na, or any paginated API
- You want to resume if something fails halfway through
- You need to fetch new data without re-downloading everything

The skill teaches Claude a bulletproof pattern: save after each page, track where you left off, never lose work.

---

### arena-cli

**Export and browse your Are.na collections.**

Use when:
- You want your Are.na blocks as local files
- You want AI to analyze your images (generates titles, tags, descriptions)
- You want to search and browse your collection visually

Includes scripts for exporting, enriching with vision AI, and generating browsable galleries.

---

## Installation

Copy any skill to your Claude skills folder:

```bash
# Available everywhere
cp -r skills/quick-view ~/.claude/skills/

# Just this project
cp -r skills/quick-view .claude/skills/
```

## License

MIT
