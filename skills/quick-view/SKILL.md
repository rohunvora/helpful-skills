---
name: quick-view
description: Generate minimal HTML pages to review Claude Code output in a browser. Use when terminal output is hard to read, when reviewing lists/tables/drafts, or when user says "show me", "make this reviewable", "quick view", or "open as webpage". Also supports COMMENT MODE for granular feedback on drafts—triggered by "comment on this", "leave comments on", "give feedback on"—which generates highlighted text with click-to-reveal inline comments. Comment mode is a granular alternative to rewrites, letting users review feedback incrementally without losing their voice.
---

# Quick View

Generate minimal HTML to review structured data in a browser. Minimal styling, maximum readability.

## When to Use

- User wants to review output that's hard to read in terminal
- Lists, tables, drafts, summaries that benefit from visual layout
- User says: "show me", "view this", "make reviewable", "open as webpage"
- **Comment mode**: User says "comment on this", "leave comments on", "give feedback on"

## Output Rules

**DO:**
- Semantic HTML: `<table>`, `<ul>`, `<details>`, `<pre>`, `<h1-3>`
- Use the base template with CSS variables
- Write to `_private/views/`
- Open with `open _private/views/{filename}`

**DO NOT:**
- Add decorative styling beyond the base template
- Use CSS frameworks
- Over-engineer or "make it nice"

## File Naming

Views have a lifecycle: temporary → keeper → archived.

| Stage | Filename | When |
|-------|----------|------|
| Temporary | `name-temp.html` | Default for new views |
| Keeper | `name.html` | User says "keep this", "this is good" |
| Archived | `name.2025-01-01.html` | Previous keeper when promoting new one |

**Rules:**
1. **Always create with `-temp` suffix** — Every new view starts as `name-temp.html`
2. **Promote on approval** — When user approves, rename to `name.html`
3. **Archive before replacing** — If `name.html` exists, rename to `name.DATE.html` before promoting
4. **Never regenerate keepers** — Only regenerate `-temp` files

**Workflow:**
```
# First iteration
drafts-temp.html  ← created

# User: "keep this"
drafts.html       ← promoted (temp deleted)

# Later iteration
drafts-temp.html  ← new temp created
drafts.html       ← keeper untouched

# User: "this is better, keep it"
drafts.2025-01-01.html  ← old keeper archived
drafts.html             ← new keeper promoted
```

**Trigger phrases for promotion:**
- "keep this", "this is good", "save this"
- "make this the default", "lock this in"
- "I like this one"

## Base Template

Every quick-view HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    :root {
      --bg: #fff;
      --text: #222;
      --muted: #666;
      --border: #ddd;
      --accent: #1976d2;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --text: #e0e0e0;
        --muted: #999;
        --border: #333;
        --accent: #64b5f6;
      }
    }
    body {
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      font-family: system-ui;
      background: var(--bg);
      color: var(--text);
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid var(--border); padding: 8px; text-align: left; }
    .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1rem; }
    details { margin: 0.5rem 0; }
    summary { cursor: pointer; }
    pre {
      background: var(--border);
      padding: 1rem;
      overflow-x: auto;
      border-radius: 4px;
    }

    /* Long content truncation */
    .truncate {
      max-height: 200px;
      overflow: hidden;
      position: relative;
    }
    .truncate.expanded { max-height: none; }
    .truncate:not(.expanded)::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(transparent, var(--bg));
    }
    .expand-btn {
      color: var(--accent);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem 0;
      font-size: 0.875rem;
    }

    /* Type borders */
    .type-user { border-left: 3px solid var(--accent); padding-left: 1rem; }
    .type-draft { border-left: 3px solid #ff9800; padding-left: 1rem; }
    .type-done { border-left: 3px solid #4caf50; padding-left: 1rem; }

    /* Source attribution */
    .source { color: var(--muted); font-size: 0.75rem; }
    .source a { color: var(--muted); }
    .source a:hover { color: var(--accent); }
  </style>
</head>
<body>
<p class="meta">Generated: {timestamp} · {count} items</p>
{content}
<script>
// Truncation toggle
document.querySelectorAll('.truncate').forEach(el => {
  if (el.scrollHeight > 220) {
    const btn = document.createElement('button');
    btn.className = 'expand-btn';
    btn.textContent = 'Show more';
    btn.onclick = () => {
      el.classList.toggle('expanded');
      btn.textContent = el.classList.contains('expanded') ? 'Show less' : 'Show more';
    };
    el.after(btn);
  } else {
    el.classList.add('expanded'); // No truncation needed
  }
});
</script>
</body>
</html>
```

## Patterns

### List of items
```html
<h1>Title</h1>
<ul>
  <li><strong>@username</strong> — action item</li>
</ul>
```

### Table
```html
<table>
  <tr><th>Contact</th><th>Action</th><th>Draft</th></tr>
  <tr><td>@name</td><td>Follow up</td><td>Hey...</td></tr>
</table>
```

### Expandable sections (for long content)
```html
<details>
  <summary><strong>@username</strong> — action</summary>
  <div class="truncate">
    <pre>Long content here that may need truncation...</pre>
  </div>
</details>
```

### Type-differentiated items
```html
<div class="type-user">User message or input</div>
<div class="type-draft">Draft content</div>
<div class="type-done">Completed item</div>
```

### With actions
```html
<p>
  <a href="tg://resolve?domain=username">Open Telegram</a> ·
  <button onclick="navigator.clipboard.writeText('draft text')">Copy</button>
</p>
```

### Sourced data (citations & drill-down)

When displaying data gathered from external sources, always include attribution links for drill-down.

**Add to base template CSS:**
```css
.source { color: var(--muted); font-size: 0.75rem; }
.source a { color: var(--muted); }
.source a:hover { color: var(--accent); }
```

**Inline attribution (preferred for lists):**
```html
<div class="tip">
  <strong>Tip title</strong> — Description of the tip.
  <span class="source">— <a href="https://x.com/user/status/123">@username</a></span>
</div>
```

**Table with source column:**
```html
<table>
  <tr><th>Tip</th><th>Source</th></tr>
  <tr>
    <td>Description here</td>
    <td class="source"><a href="https://x.com/user/status/123">@user</a></td>
  </tr>
</table>
```

**Expandable with source in summary:**
```html
<details>
  <summary><strong>Tip title</strong> <span class="source">— <a href="URL">@source</a></span></summary>
  <p>Full content...</p>
</details>
```

**Meta header with main source:**
```html
<p class="meta">
  Generated: {timestamp} · {count} items ·
  Source: <a href="https://x.com/user/status/123">Original thread</a>
</p>
```

**Principles:**
- Always link to original when data comes from external sources
- Use `@username` for social media, domain for articles
- Source links should be muted/subtle, not prominent
- Include main source in meta header for collections from single source

### Editable drafts (with diff tracking)

For drafts that user may edit before sending. Tracks original vs edited for later analysis.

```html
<details>
  <summary><strong>@username</strong> — action <span class="status"></span></summary>
  <pre contenteditable="true"
       data-username="username"
       data-original="Original draft text here"
       onblur="saveDraft(this)">Original draft text here</pre>
  <div class="actions">
    <a href="tg://resolve?domain=username">Open Telegram</a>
    <button onclick="copyDraft(this)">Copy</button>
  </div>
</details>
```

Include this script block at end of `<body>` (before closing `</body>` tag):

```javascript
function saveDraft(el) {
  const key = 'draft_' + el.dataset.username;
  const edited = el.textContent.trim();
  const original = el.dataset.original;
  if (edited !== original) {
    localStorage.setItem(key, edited);
    el.closest('details').querySelector('.status').textContent = '(edited)';
  }
}

function copyDraft(btn) {
  const pre = btn.closest('details').querySelector('pre');
  navigator.clipboard.writeText(pre.textContent.trim());
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 1500);
}

function restoreEdits() {
  document.querySelectorAll('pre[data-username]').forEach(el => {
    const saved = localStorage.getItem('draft_' + el.dataset.username);
    if (saved) {
      el.textContent = saved;
      el.closest('details').querySelector('.status').textContent = '(edited)';
    }
  });
}

function exportEdits() {
  const edits = [];
  document.querySelectorAll('pre[data-username]').forEach(el => {
    const original = el.dataset.original;
    const current = el.textContent.trim();
    if (original !== current) {
      edits.push({ username: el.dataset.username, original, edited: current });
    }
  });
  if (edits.length === 0) { alert('No edits to export'); return; }
  const blob = new Blob([JSON.stringify({exported_at: new Date().toISOString(), edits}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'draft_edits.json';
  a.click();
}

restoreEdits();
```

Add export button in header when using editable drafts:
```html
<p class="meta">Generated: {timestamp} · {count} drafts · <button onclick="exportEdits()">Export Edits</button></p>
```

## Comment Mode

Granular alternative to rewrites. Instead of rewriting text, generate highlighted HTML with click-to-reveal comments. User reviews feedback incrementally without losing their voice.

### Triggers

- "comment on this", "leave comments on", "give feedback on"
- Additional context specifies the lens: "focus on word choice", "as [person] would react", "only tone", etc.

### Clarify Before Commenting

Use AskUserQuestion to clarify scope when the request is ambiguous. Avoid over-commenting (overwhelming) or under-commenting (missing the point).

**Clarify when:**
- No lens specified → ask what angle they want
- Long document → ask if they want full coverage or just key sections
- Unclear audience → ask who the recipient is (affects POV comments)

**Skip clarification when:**
- Lens is explicit ("comment on word choice only")
- Document is short (<500 words)
- Context is obvious from conversation

**Example clarification:**
```
User: "comment on this"
[long doc, no lens specified]

→ Use AskUserQuestion:
  "What should I focus on?"
  Options:
  - "Editor feedback (structure, clarity, word choice)"
  - "Recipient POV (how [person] would react)"
  - "Specific angle (tell me what)"
```

### Lenses

| Lens | Color | Comment style |
|------|-------|---------------|
| Editor | Yellow (#fff3cd) | observations, suggestions: "weak opener", "add proof here" |
| POV (as person) | Blue (#e3f2fd) | reactions from that person's perspective: "i know this already", "legal would freak out" |
| Focused | Yellow | specific angle only: "word choice", "tone", "weak arguments" |

### Comment Style

- Always lowercase
- Short (5-15 words)
- Smart about type: observations when noting, suggestions when alternatives help, reactions when simulating POV
- Match the lens energy

### Comment Mode Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fafafa;
    }
    h1, h2, h3 { margin-top: 2em; font-weight: 600; }
    h1 { font-size: 1.4em; }
    h2 { font-size: 1.2em; color: #333; }
    p { margin: 1em 0; }

    .highlight {
      background: {highlight-bg};  /* #fff3cd for editor, #e3f2fd for POV */
      padding: 1px 4px;
      border-radius: 3px;
      cursor: pointer;
      border-bottom: 2px solid {highlight-border};  /* #ffc107 for editor, #2196f3 for POV */
      transition: background 0.15s;
    }
    .highlight:hover, .highlight.active {
      background: {highlight-hover};  /* #ffe69c for editor, #bbdefb for POV */
    }

    .comment {
      display: none;
      background: {comment-bg};  /* #1a1a1a for editor, #0052cc for POV */
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85em;
      margin: 8px 0;
      line-height: 1.5;
    }
    .comment.show { display: block; }

    .section-break {
      border: none;
      border-top: 1px solid #ddd;
      margin: 2em 0;
    }

    .legend {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      font-size: 0.8em;
      color: #666;
    }
  </style>
</head>
<body>

{content with <span class="highlight" data-comment="comment text">highlighted phrase</span>}

<div class="legend">{legend text}</div>

<script>
document.querySelectorAll('.highlight').forEach(el => {
  const commentText = el.getAttribute('data-comment');
  const commentDiv = document.createElement('div');
  commentDiv.className = 'comment';
  commentDiv.textContent = commentText;
  el.insertAdjacentElement('afterend', commentDiv);

  el.addEventListener('click', () => {
    const wasActive = el.classList.contains('active');
    document.querySelectorAll('.highlight').forEach(h => h.classList.remove('active'));
    document.querySelectorAll('.comment').forEach(c => c.classList.remove('show'));
    if (!wasActive) {
      el.classList.add('active');
      commentDiv.classList.add('show');
    }
  });
});
</script>
</body>
</html>
```

### Comment Mode Workflow

1. User pastes text + asks for comments with optional lens
2. **If ambiguous**: Use AskUserQuestion to clarify lens/scope/audience
3. Read text, identify key phrases worth commenting on (density depends on lens)
4. Generate HTML with highlights and `data-comment` attributes
5. Write to `_private/views/{name}-comments-temp.html`
6. Run `open _private/views/{name}-comments-temp.html`

### Examples

**Editor mode:**
```
User: "comment on this, focus on word choice"
→ Yellow highlights, suggestions like "vague, try 'specifically'" or "jargon, simplify"
```

**POV mode:**
```
User: "comment on this as brian would react"
→ Blue highlights, reactions like "i already know this" or "legal would push back here"
```

**Focused mode:**
```
User: "leave comments on this, only flag weak arguments"
→ Yellow highlights on weak claims, comments like "needs evidence" or "assumes too much"
```

## Workflow

1. Identify the data to display (file, variable, recent output)
2. Choose pattern: list, table, expandable sections, or **comment mode**
3. Generate HTML using template above
4. Write to `_private/views/{name}-temp.html`
5. Run `open _private/views/{name}-temp.html`
6. If user approves, promote to `{name}.html`

## Example

User: "show me the drafts"

Claude:
1. Reads `_private/drafts/outreach_drafts.md`
2. Parses each draft (heading = contact, body = draft)
3. Generates HTML with `<details>` for each draft
4. Writes to `_private/views/drafts-temp.html`
5. Runs `open _private/views/drafts-temp.html`

Result: Browser opens, user sees expandable list of drafts with auto dark/light mode, long content truncated with "Show more", can copy each one.

User: "this looks good, keep it"

Claude:
1. Renames `drafts-temp.html` → `drafts.html`
2. Confirms: "Saved as drafts.html"

## Styling Handoff

This skill produces functional HTML with minimal styling. For full visual styling, invoke the `html-style` skill after generating.

**Classes used by quick-view (compatible with html-style):**

| Class | Purpose |
|-------|---------|
| `.type-user` | User input/message |
| `.type-draft` | Draft content |
| `.type-done` | Completed item |
| `.source` | Attribution links |
| `.meta` | Metadata header |
| `.truncate` | Long content container |
| `.actions` | Action button container |

**Data attributes for JS hooks:**
- `data-username` — Identifier for drafts
- `data-original` — Original text for diff tracking

## Attribution

Truncation pattern and CSS variables approach inspired by [simon willison's claude-code-transcripts](https://github.com/simonw/claude-code-transcripts).
