# Helpful Skills

A collection of skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that extend its capabilities with specialized workflows.

## What are Skills?

Skills are modular packages that give Claude procedural knowledge it doesn't have natively. Think of them as "onboarding docs" that transform Claude from a general-purpose agent into a specialist.

## Available Skills

| Skill | Description |
|-------|-------------|
| [arena-cli](skills/arena-cli/) | Export, enrich, and browse Are.na blocks with vision AI |
| [quick-view](skills/quick-view/) | Generate HTML pages to review terminal output in a browser |
| [table-filters](skills/table-filters/) | Design optimal filtering UX for data tables |
| [html-style](skills/html-style/) | Apply consistent visual styling to HTML |
| [incremental-fetch](skills/incremental-fetch/) | Build resilient API data pipelines with progress tracking |

## Installation

### Per-user (available in all projects)

```bash
cp -r skills/quick-view ~/.claude/skills/
```

### Per-project

```bash
cp -r skills/quick-view /path/to/project/.claude/skills/
```

## How Skills Work Together

The HTML skills are designed to compose:

```
quick-view  →  generates semantic HTML
     ↓
html-style  →  applies visual styling
```

For filtered tables:

```
quick-view + table-filters  →  semantic HTML with filter UX
            ↓
        html-style          →  fully styled output
```

## For AI Agents

See [AGENTS.md](AGENTS.md) for a quick reference optimized for AI agents.

## Documentation

- [AGENTS.md](AGENTS.md) — Agent-friendly quick reference
- [CHANGELOG.md](CHANGELOG.md) — Build process and decisions
- [logs/](logs/) — Architecture docs and design decisions

## License

MIT
