#!/usr/bin/env node
/**
 * Generate visual search results view for Are.na blocks with selection capability
 *
 * Use when terminal output is insufficient - shows actual images in browser.
 * Supports selection mode for validating/picking results to fill gaps.
 *
 * Usage:
 *   node gen-search-view.cjs "pattern1,pattern2" "pattern3"    # Ad-hoc search
 *   node gen-search-view.cjs --config=searches.json            # From config file
 *   node gen-search-view.cjs --config=searches.json --open     # Open in browser
 *   node gen-search-view.cjs --config=searches.json --select   # Enable selection mode
 *
 * Config file format (searches.json):
 *   [
 *     { "name": "Dashboards", "patterns": ["dashboard", "metric-cards", "kpi"] },
 *     { "name": "Charts", "patterns": ["chart", "graph", "visualization"] }
 *   ]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config from env or defaults
const EXPORT_DIR = process.env.ARENA_EXPORT_DIR || path.join(process.cwd(), 'arena-export');
const BLOCKS_DIR = path.join(EXPORT_DIR, 'blocks');
const OUTPUT_FILE = path.join(EXPORT_DIR, 'search-results.html');

// Parse args
const args = process.argv.slice(2);
const configArg = args.find(a => a.startsWith('--config='));
const openFlag = args.includes('--open');
const selectFlag = args.includes('--select');
const patternArgs = args.filter(a => !a.startsWith('--'));

let searches = [];

if (configArg) {
  const configPath = configArg.split('=')[1];
  const configFile = path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
  if (!fs.existsSync(configFile)) {
    console.error('Config file not found:', configFile);
    process.exit(1);
  }
  searches = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
} else if (patternArgs.length > 0) {
  searches = patternArgs.map((arg, i) => ({
    name: `Search ${i + 1}`,
    patterns: arg.split(',').map(p => p.trim())
  }));
} else {
  console.log('Usage:');
  console.log('  node gen-search-view.cjs "pattern1,pattern2" "pattern3"');
  console.log('  node gen-search-view.cjs --config=searches.json [--open] [--select]');
  console.log('');
  console.log('Flags:');
  console.log('  --open    Open in browser after generating');
  console.log('  --select  Enable selection mode (checkboxes + copy output)');
  process.exit(0);
}

// Load all blocks
if (!fs.existsSync(BLOCKS_DIR)) {
  console.error('Blocks directory not found:', BLOCKS_DIR);
  console.error('Run export-blocks.ts first');
  process.exit(1);
}

const files = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.json'));
const blocks = files.map(f => {
  try {
    return JSON.parse(fs.readFileSync(path.join(BLOCKS_DIR, f), 'utf-8'));
  } catch { return null; }
}).filter(Boolean);

console.log(`Loaded ${blocks.length} blocks`);

// Search function
function searchBlocks(patterns, maxResults = 12) {
  return blocks.filter(b => {
    if (!b.vision) return false;
    const searchText = JSON.stringify(b.vision).toLowerCase();
    return patterns.some(p => searchText.includes(p.toLowerCase()));
  }).slice(0, maxResults);
}

// Run searches
const results = searches.map(s => ({
  name: s.name,
  patterns: s.patterns,
  blocks: searchBlocks(s.patterns)
}));

const withResults = results.filter(r => r.blocks.length > 0);
const noResults = results.filter(r => r.blocks.length === 0);
const totalMatches = withResults.reduce((a, r) => a + r.blocks.length, 0);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Generate HTML
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gap Reference Search${selectFlag ? ' - Select Mode' : ''}</title>
  <style>
    :root { --bg: #fff; --text: #222; --muted: #666; --border: #ddd; --accent: #1976d2; --selected: #e3f2fd; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #1a1a1a; --text: #e0e0e0; --muted: #999; --border: #333; --accent: #64b5f6; --selected: #1e3a5f; }
    }
    * { box-sizing: border-box; }
    body { max-width: 1400px; margin: 0 auto; padding: 20px; padding-bottom: ${selectFlag ? '180px' : '20px'}; font-family: system-ui; background: var(--bg); color: var(--text); }
    h1 { border-bottom: 2px solid var(--border); padding-bottom: 10px; }
    .section { margin: 32px 0; }
    .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .section-title { font-size: 20px; font-weight: 600; margin: 0; }
    .count { background: var(--accent); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .count-zero { background: #c00; }
    .patterns { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .card { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: all 0.1s; position: relative; }
    .card:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .card.selected { border-color: var(--accent); background: var(--selected); }
    .card img { width: 100%; height: 150px; object-fit: cover; background: var(--border); display: block; cursor: zoom-in; }
    .card-body { padding: 8px; }
    .card-title { font-size: 12px; font-weight: 500; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-patterns { font-size: 10px; color: var(--muted); margin-top: 4px; }
    .tag { display: inline-block; background: var(--accent); color: white; padding: 1px 5px; border-radius: 3px; font-size: 9px; margin-right: 3px; }
    a.card-link { text-decoration: none; color: inherit; display: block; }
    .empty { color: var(--muted); font-style: italic; padding: 20px; text-align: center; border: 1px dashed var(--border); border-radius: 8px; }
    .meta { color: var(--muted); font-size: 14px; margin-bottom: 24px; }

    /* Lightbox */
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: none; justify-content: center; align-items: center; z-index: 1000; cursor: zoom-out; }
    .lightbox.open { display: flex; }
    .lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 4px; }
    .lightbox-hint { position: absolute; bottom: 20px; color: #999; font-size: 12px; }

    /* Selection mode styles */
    .checkbox { position: absolute; top: 8px; left: 8px; width: 20px; height: 20px; cursor: pointer; z-index: 10; accent-color: var(--accent); }
    .selection-panel { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg); border-top: 2px solid var(--accent); padding: 12px 20px; box-shadow: 0 -4px 12px rgba(0,0,0,0.15); z-index: 100; }
    .selection-panel-inner { max-width: 1400px; margin: 0 auto; }
    .selection-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .selection-count { font-weight: 600; }
    .selection-actions { display: flex; gap: 8px; }
    .selection-actions button { padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--text); cursor: pointer; font-size: 13px; }
    .selection-actions button:hover { background: var(--border); }
    .selection-actions button.primary { background: var(--accent); color: white; border-color: var(--accent); }
    .output-area { width: 100%; height: 80px; font-family: monospace; font-size: 11px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); resize: none; }
    .copied-toast { position: fixed; bottom: 200px; left: 50%; transform: translateX(-50%); background: #4caf50; color: white; padding: 8px 16px; border-radius: 4px; opacity: 0; transition: opacity 0.2s; }
    .copied-toast.show { opacity: 1; }
  </style>
</head>
<body>
<h1>Gap Reference Search${selectFlag ? ' <span style="color: var(--accent); font-size: 16px;">· Select Mode</span>' : ''}</h1>
<p class="meta">Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${totalMatches} matches across ${withResults.length} categories${selectFlag ? ' · Click checkboxes to select, copy output below' : ''}</p>

<div id="lightbox" class="lightbox" onclick="closeLightbox()">
  <img src="" alt="">
  <div class="lightbox-hint">Click anywhere or press Esc to close</div>
</div>

${withResults.map(r => `
<div class="section" data-category="${escapeHtml(r.name)}">
  <div class="section-header">
    <h2 class="section-title">${escapeHtml(r.name)}</h2>
    <span class="count">${r.blocks.length}</span>
  </div>
  <div class="patterns">Patterns: ${r.patterns.join(', ')}</div>
  <div class="grid">
    ${r.blocks.map(b => `
    <div class="card" data-id="${b.id}" data-category="${escapeHtml(r.name)}" data-title="${escapeHtml(b.vision?.suggested_title || b.title || 'Untitled')}">
      ${selectFlag ? `<input type="checkbox" class="checkbox" onclick="toggleSelect(this)" />` : ''}
      <img src="${b.image_url || ''}" loading="lazy" alt="" onerror="this.style.display='none'" onclick="openLightbox(this.src)">
      <a href="https://www.are.na/block/${b.id}" target="_blank" class="card-link">
        <div class="card-body">
          <div class="card-title">${escapeHtml((b.vision?.suggested_title || b.title || 'Untitled').slice(0, 40))}</div>
          <div class="card-patterns">
            ${(b.vision?.ui_patterns || []).slice(0, 3).map(p => `<span class="tag">${escapeHtml(p)}</span>`).join('')}
          </div>
        </div>
      </a>
    </div>`).join('')}
  </div>
</div>`).join('')}

${noResults.map(r => `
<div class="section">
  <div class="section-header">
    <h2 class="section-title">${escapeHtml(r.name)}</h2>
    <span class="count count-zero">0</span>
  </div>
  <div class="patterns">Patterns: ${r.patterns.join(', ')}</div>
  <div class="empty">No matches found - gap needs references</div>
</div>`).join('')}

<script>
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  lb.querySelector('img').src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
</script>

${selectFlag ? `
<div class="selection-panel">
  <div class="selection-panel-inner">
    <div class="selection-header">
      <span class="selection-count"><span id="selected-count">0</span> selected</span>
      <div class="selection-actions">
        <button onclick="clearAll()">Clear All</button>
        <button class="primary" onclick="copyOutput()">Copy Selection</button>
      </div>
    </div>
    <textarea id="output" class="output-area" readonly placeholder="Select items above to generate output..."></textarea>
  </div>
</div>
<div id="toast" class="copied-toast">Copied!</div>

<script>
function toggleSelect(checkbox) {
  const card = checkbox.closest('.card');
  card.classList.toggle('selected', checkbox.checked);
  updateOutput();
}

function updateOutput() {
  const selected = document.querySelectorAll('.card.selected');
  const byCategory = {};

  selected.forEach(card => {
    const category = card.dataset.category;
    const id = parseInt(card.dataset.id);
    const title = card.dataset.title;

    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push({ id, title });
  });

  document.getElementById('selected-count').textContent = selected.length;

  if (selected.length === 0) {
    document.getElementById('output').value = '';
    return;
  }

  // Format: structured by gap category
  const output = {
    _context: "Gap references selected from Are.na",
    selections: byCategory
  };

  document.getElementById('output').value = JSON.stringify(output, null, 2);
}

function copyOutput() {
  const output = document.getElementById('output');
  if (!output.value) return;

  navigator.clipboard.writeText(output.value);
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

function clearAll() {
  document.querySelectorAll('.card.selected').forEach(card => {
    card.classList.remove('selected');
    card.querySelector('.checkbox').checked = false;
  });
  updateOutput();
}
</script>
` : ''}

</body>
</html>`;

fs.writeFileSync(OUTPUT_FILE, html);
console.log('Generated:', OUTPUT_FILE);
console.log(`Categories: ${withResults.length} with results, ${noResults.length} empty`);
console.log(`Total matches: ${totalMatches}`);
if (selectFlag) {
  console.log('Selection mode: enabled');
}

if (openFlag) {
  execSync(`open "${OUTPUT_FILE}"`);
}
