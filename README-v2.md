# Helpful Skills

Teach Claude Code new tricks. Install a skill, and Claude just knows how to do it.

<!-- [PLACEHOLDER: Hero image or logo] -->

---

## Skills

### quick-view

Turn terminal output into a readable webpage.

Say "show me this" — Claude generates clean HTML and opens it in your browser. No more squinting at walls of JSON.

<details>
<summary>Use when</summary>

- Reviewing structured data (logs, API responses, lists)
- Comparing items side-by-side
- Anything hard to scan in the terminal

</details>

---

### table-filters

Add the right filter to each column.

Describe your data. Claude picks the filter type — text search, checkboxes, date range, numeric slider — based on what makes sense.

<details>
<summary>Use when</summary>

- Building searchable data tables
- Users need to slice large datasets

</details>

---

### html-style

Make HTML look finished.

Takes functional markup and adds polish: dark mode, status colors, visual hierarchy. Pairs with quick-view and table-filters.

<details>
<summary>Use when</summary>

- You have working HTML that needs styling
- You want consistent visual treatment

</details>

---

### incremental-fetch

Download API data without losing progress.

Saves after each page. Tracks where you left off. Resumes if interrupted. Never re-downloads what you already have.

<details>
<summary>Use when</summary>

- Pulling from paginated APIs (Twitter, Are.na, any REST endpoint)
- Building data pipelines that cannot afford to restart

</details>

---

### arena-cli

Export and search your Are.na visually.

Fetch blocks from your channels. Enrich images with AI-generated titles and tags. Browse everything in a local gallery.

<details>
<summary>Use when</summary>

- You collect inspiration on Are.na
- You want to search your visual library with AI

</details>

---

## Install

Copy a skill to your Claude folder:

```sh
cp -r skills/quick-view ~/.claude/skills/
```

Claude picks it up automatically.

---

MIT License
