#!/usr/bin/env node
/**
 * Generate browsable HTML view of Are.na export
 *
 * Usage:
 *   node gen-view.cjs                    # Use default paths
 *   node gen-view.cjs --open             # Generate and open in browser
 *
 * Environment:
 *   ARENA_EXPORT_DIR - Export directory (default: ./arena-export)
 *   ARENA_VIEW_FILE  - Output HTML file (default: ./arena-export/view.html)
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = process.env.ARENA_EXPORT_DIR || path.join(process.cwd(), 'arena-export');
const BLOCKS_DIR = path.join(EXPORT_DIR, 'blocks');
const OUTPUT_FILE = process.env.ARENA_VIEW_FILE || path.join(EXPORT_DIR, 'view.html');

// Load all blocks
const files = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.json'));
const blocks = files.map(f => JSON.parse(fs.readFileSync(path.join(BLOCKS_DIR, f), 'utf-8')));

// Sort by created_at descending
blocks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// Stats
const byClass = {};
const byChannel = {};
const allTags = {};
const allPatterns = {};
let enrichedCount = 0;

blocks.forEach(b => {
  byClass[b.class] = (byClass[b.class] || 0) + 1;
  b.channels.forEach(ch => byChannel[ch] = (byChannel[ch] || 0) + 1);
  if (b.vision) {
    enrichedCount++;
    (b.vision.tags || []).forEach(t => allTags[t] = (allTags[t] || 0) + 1);
    (b.vision.ui_patterns || []).forEach(p => allPatterns[p] = (allPatterns[p] || 0) + 1);
  }
});

// Top tags and patterns
const topTags = Object.entries(allTags).sort((a,b) => b[1] - a[1]).slice(0, 20);
const topPatterns = Object.entries(allPatterns).sort((a,b) => b[1] - a[1]).slice(0, 15);

// Helper
const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';

// Generate HTML
let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Are.na Export (Enriched)</title>
  <style>
    :root { --bg: #fff; --text: #222; --muted: #666; --border: #ddd; --accent: #1976d2; --success: #22c55e; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #1a1a1a; --text: #e0e0e0; --muted: #999; --border: #333; --accent: #64b5f6; --success: #4ade80; }
    }
    body { max-width: 1400px; margin: 40px auto; padding: 0 20px; font-family: system-ui; background: var(--bg); color: var(--text); }
    .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1rem; }
    h1 { border-bottom: 2px solid var(--border); padding-bottom: 10px; }
    h2 { color: var(--text); margin-top: 32px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }

    .stats { display: flex; gap: 32px; flex-wrap: wrap; margin: 24px 0; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { font-size: 12px; color: var(--muted); }

    .filters { margin: 16px 0; display: flex; gap: 8px; flex-wrap: wrap; }
    .filter { padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg); cursor: pointer; font-size: 14px; color: var(--text); }
    .filter.active { background: var(--text); color: var(--bg); border-color: var(--text); }
    .filter .count { color: var(--muted); margin-left: 4px; }
    .filter.active .count { color: var(--bg); opacity: 0.7; }

    .search { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 14px; width: 300px; margin-bottom: 16px; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
    .card { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: transform 0.1s; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .card.enriched { border-left: 3px solid var(--success); }
    .card img { width: 100%; height: 180px; object-fit: cover; background: var(--border); }
    .card .no-img { width: 100%; height: 180px; background: var(--border); display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; }
    .card-body { padding: 12px; }
    .card-title { font-size: 14px; font-weight: 600; margin: 0 0 6px 0; line-height: 1.3; }
    .card-desc { font-size: 12px; color: var(--muted); margin: 0 0 8px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-meta { font-size: 11px; color: var(--muted); }
    .tags { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; background: var(--border); }
    .tag.pattern { background: var(--accent); color: white; }

    .tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    .tag-cloud .tag { cursor: pointer; padding: 4px 10px; font-size: 12px; }
    .tag-cloud .tag:hover { background: var(--accent); color: white; }

    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td, th { border: 1px solid var(--border); padding: 8px; text-align: left; font-size: 14px; }

    .hidden { display: none !important; }
  </style>
</head>
<body>
<h1>Are.na Export (Enriched)</h1>
<p class="meta">Generated: ${new Date().toISOString().slice(0,16).replace('T',' ')} · ${blocks.length} blocks · ${enrichedCount} enriched</p>

<div class="stats">
  <div class="stat"><div class="stat-value">${blocks.length}</div><div class="stat-label">Total Blocks</div></div>
  <div class="stat"><div class="stat-value">${enrichedCount}</div><div class="stat-label">Enriched</div></div>
  <div class="stat"><div class="stat-value">${Object.keys(byChannel).length}</div><div class="stat-label">Channels</div></div>
  <div class="stat"><div class="stat-value">${byClass['Image'] || 0}</div><div class="stat-label">Images</div></div>
  <div class="stat"><div class="stat-value">${Object.keys(allTags).length}</div><div class="stat-label">Unique Tags</div></div>
  <div class="stat"><div class="stat-value">${Object.keys(allPatterns).length}</div><div class="stat-label">UI Patterns</div></div>
</div>

<h2>Top UI Patterns</h2>
<div class="tag-cloud">
${topPatterns.map(([p, c]) => `  <span class="tag pattern" onclick="filterByTag('${esc(p)}')">${esc(p)} (${c})</span>`).join('\n')}
</div>

<h2>Top Tags</h2>
<div class="tag-cloud">
${topTags.map(([t, c]) => `  <span class="tag" onclick="filterByTag('${esc(t)}')">${esc(t)} (${c})</span>`).join('\n')}
</div>

<h2>All Blocks</h2>
<input type="text" class="search" placeholder="Search titles, tags, patterns..." oninput="filterBlocks(this.value)">
<div class="filters">
  <button class="filter active" data-filter="all">All <span class="count">${blocks.length}</span></button>
  <button class="filter" data-filter="enriched">Enriched <span class="count">${enrichedCount}</span></button>
${Object.entries(byClass).sort((a,b) => b[1] - a[1]).map(([c, n]) => `  <button class="filter" data-filter="${c}">${c} <span class="count">${n}</span></button>`).join('\n')}
</div>
<div class="grid">
`;

blocks.forEach(b => {
  const title = b.vision?.suggested_title || b.title || '(untitled)';
  const desc = b.vision?.description || '';
  const tags = b.vision?.tags || [];
  const patterns = b.vision?.ui_patterns || [];
  const isEnriched = !!b.vision;
  const searchData = [title, desc, ...tags, ...patterns].join(' ').toLowerCase();

  html += `  <div class="card ${isEnriched ? 'enriched' : ''}" data-class="${b.class}" data-enriched="${isEnriched}" data-search="${esc(searchData)}">
`;

  if (b.image_url) {
    html += `    <a href="https://www.are.na/block/${b.id}" target="_blank"><img src="${esc(b.image_url)}" loading="lazy" alt=""></a>
`;
  } else {
    html += `    <a href="https://www.are.na/block/${b.id}" target="_blank"><div class="no-img">${b.class}</div></a>
`;
  }

  html += `    <div class="card-body">
      <div class="card-title">${esc(title.slice(0, 60))}</div>
`;
  if (desc) {
    html += `      <div class="card-desc">${esc(desc)}</div>
`;
  }
  html += `      <div class="card-meta">${b.class} · ${b.channels[0] || ''}</div>
`;
  if (patterns.length > 0 || tags.length > 0) {
    html += `      <div class="tags">
`;
    patterns.slice(0, 3).forEach(p => {
      html += `        <span class="tag pattern">${esc(p)}</span>
`;
    });
    tags.slice(0, 4).forEach(t => {
      html += `        <span class="tag">${esc(t)}</span>
`;
    });
    html += `      </div>
`;
  }
  html += `    </div>
  </div>
`;
});

html += `</div>

<script>
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.card');

filters.forEach(f => {
  f.addEventListener('click', () => {
    filters.forEach(x => x.classList.remove('active'));
    f.classList.add('active');
    const filter = f.dataset.filter;
    cards.forEach(c => {
      if (filter === 'all') c.classList.remove('hidden');
      else if (filter === 'enriched') c.classList.toggle('hidden', c.dataset.enriched !== 'true');
      else c.classList.toggle('hidden', c.dataset.class !== filter);
    });
  });
});

function filterBlocks(query) {
  const q = query.toLowerCase();
  cards.forEach(c => {
    c.classList.toggle('hidden', !c.dataset.search.includes(q));
  });
}

function filterByTag(tag) {
  document.querySelector('.search').value = tag;
  filterBlocks(tag);
}
</script>
</body>
</html>`;

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, html);
console.log('Generated:', OUTPUT_FILE);
console.log('Blocks:', blocks.length);
console.log('Enriched:', enrichedCount);
console.log('Tags:', Object.keys(allTags).length);
console.log('Patterns:', Object.keys(allPatterns).length);

// Open in browser if --open flag
if (process.argv.includes('--open')) {
  const { exec } = require('child_process');
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${OUTPUT_FILE}"`);
  console.log('Opening in browser...');
}
