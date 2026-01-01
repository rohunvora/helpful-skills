#!/usr/bin/env npx ts-node
/**
 * Are.na Block Enrichment via Vision AI
 *
 * Analyzes block images with Gemini Vision to generate:
 * - Clean, descriptive titles (replacing broken filenames)
 * - Descriptions suitable for Are.na
 * - Structured searchable tags
 * - UI pattern classification
 *
 * Usage:
 *   npx ts-node enrich-blocks.ts                    # First channel with images
 *   npx ts-node enrich-blocks.ts --channel=slug    # Specific channel
 *   npx ts-node enrich-blocks.ts --all             # All channels
 *   npx ts-node enrich-blocks.ts --force           # Re-enrich already processed
 *   npx ts-node enrich-blocks.ts --dry-run         # Preview without saving
 *
 * Environment:
 *   GEMINI_API_KEY or GOOGLE_API_KEY - Required for vision analysis
 *   ARENA_EXPORT_DIR - Export directory (default: ./arena-export)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const EXPORT_DIR = process.env.ARENA_EXPORT_DIR || path.join(process.cwd(), 'arena-export');
const BLOCKS_DIR = path.join(EXPORT_DIR, 'blocks');
const STATE_FILE = path.join(EXPORT_DIR, 'state.json');

const RATE_LIMIT_MS = 1000; // 1 request per second
// Gemini 3 Pro Image Preview - latest vision model
// Source: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image
const GEMINI_MODEL = 'gemini-3-pro-image-preview';

// ============================================================================
// TYPES
// ============================================================================

interface VisionEnrichment {
  suggested_title: string;
  description: string;
  tags: string[];
  ui_patterns: string[];
  enriched_at: string;
  model: string;
}

interface ExportedBlock {
  id: number;
  title: string | null;
  class: string;
  created_at: string;
  updated_at: string;
  content: string | null;
  description: string | null;
  source_url: string | null;
  image_url: string | null;
  image_local: string | null;
  attachment_url: string | null;
  embed_url: string | null;
  channels: string[];
  exported_at: string;
  vision?: VisionEnrichment;
}

interface EnrichmentState {
  total_enriched: number;
  last_enriched_at: string | null;
  channels_enriched: Record<string, {
    total: number;
    enriched: number;
    last_block_id: number | null;
  }>;
}

interface ExportState {
  user_slug: string;
  channels: Record<string, any>;
  last_channels_fetch: string | null;
  created_at: string;
  updated_at: string;
  enrichment?: EnrichmentState;
}

// ============================================================================
// GEMINI CLIENT
// ============================================================================

function createGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_API_KEY in .env');
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

async function analyzeImage(
  genAI: GoogleGenerativeAI,
  imageUrl: string,
  existingContent: string | null
): Promise<VisionEnrichment> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = `Analyze this image for a design reference library (Are.na).

Generate:
1. **suggested_title**: A clean, descriptive title (3-8 words). NOT a filename. Describe what this IS, not what it shows.
   - Good: "Dark Mode Trading Dashboard", "Mobile Onboarding Flow", "Stat Card with Progress Bars"
   - Bad: "Screenshot", "UI Design", "Image of interface"

2. **description**: 1-2 sentences describing what makes this notable as a design reference. What could someone learn from this?

3. **tags**: 5-15 lowercase tags for searching. Include:
   - Layout type: table, card, list, grid, dashboard, modal, form, nav
   - Components: avatar, button, input, stat-bar, progress, badge, tag, icon
   - Patterns: leaderboard, onboarding, settings, profile, feed, search
   - Style: dark-mode, light-mode, minimal, dense, colorful, monochrome
   - Platform: mobile, desktop, web, ios, android

4. **ui_patterns**: Specific UI patterns visible (for styling reference):
   - Examples: "inline-stats", "avatar-with-name", "tiered-ranking", "progress-percentage", "sortable-headers", "status-pills", "metric-cards"

${existingContent ? `\nExisting content/OCR for context: "${existingContent.slice(0, 500)}"` : ''}

Respond in JSON format only:
{
  "suggested_title": "...",
  "description": "...",
  "tags": ["...", "..."],
  "ui_patterns": ["...", "..."]
}`;

  try {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      prompt,
    ]);

    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      suggested_title: parsed.suggested_title || 'Untitled',
      description: parsed.description || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      ui_patterns: Array.isArray(parsed.ui_patterns) ? parsed.ui_patterns : [],
      enriched_at: new Date().toISOString(),
      model: GEMINI_MODEL,
    };
  } catch (error: any) {
    // Return minimal enrichment on error
    console.error(`   ⚠️ Vision error: ${error.message}`);
    return {
      suggested_title: 'Analysis Failed',
      description: `Error: ${error.message}`,
      tags: ['error'],
      ui_patterns: [],
      enriched_at: new Date().toISOString(),
      model: GEMINI_MODEL,
    };
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function loadState(): ExportState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  throw new Error('No state.json found. Run export first.');
}

function saveState(state: ExportState): void {
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadBlock(blockId: number): ExportedBlock | null {
  const blockFile = path.join(BLOCKS_DIR, `${blockId}.json`);
  if (fs.existsSync(blockFile)) {
    return JSON.parse(fs.readFileSync(blockFile, 'utf-8'));
  }
  return null;
}

function saveBlock(block: ExportedBlock): void {
  const blockFile = path.join(BLOCKS_DIR, `${block.id}.json`);
  fs.writeFileSync(blockFile, JSON.stringify(block, null, 2));
}

function getBlocksForChannel(channelSlug: string): number[] {
  const blockIds: number[] = [];
  const files = fs.readdirSync(BLOCKS_DIR);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const blockId = parseInt(file.replace('.json', ''), 10);
    const block = loadBlock(blockId);
    if (block && block.channels.includes(channelSlug)) {
      blockIds.push(blockId);
    }
  }

  return blockIds;
}

function getAllImageBlocks(): number[] {
  const blockIds: number[] = [];
  const files = fs.readdirSync(BLOCKS_DIR);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const blockId = parseInt(file.replace('.json', ''), 10);
    const block = loadBlock(blockId);
    if (block && block.class === 'Image' && block.image_url) {
      blockIds.push(blockId);
    }
  }

  return blockIds;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('              ARE.NA BLOCK ENRICHMENT (VISION AI)              ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Parse args
  const args = process.argv.slice(2);
  const forceReenrich = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const allChannels = args.includes('--all');
  const channelArg = args.find(a => a.startsWith('--channel='));
  // If no channel specified and not --all, process all (user should specify)
  const targetChannel = channelArg?.split('=')[1] || null;

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'ENRICH'}`);
  console.log(`Force re-enrich: ${forceReenrich ? 'YES' : 'NO'}`);
  console.log(`Target: ${targetChannel || 'ALL CHANNELS'}`);

  // Initialize Gemini
  const genAI = createGeminiClient();
  console.log(`\n✅ Gemini client initialized`);

  // Load state
  const state = loadState();

  // Initialize enrichment state if needed
  if (!state.enrichment) {
    state.enrichment = {
      total_enriched: 0,
      last_enriched_at: null,
      channels_enriched: {},
    };
  }

  // Get blocks to process
  let blockIds: number[];
  if (targetChannel) {
    console.log(`\n📂 Loading blocks from channel: ${targetChannel}`);
    blockIds = getBlocksForChannel(targetChannel);
  } else {
    console.log(`\n📂 Loading all image blocks`);
    blockIds = getAllImageBlocks();
  }

  // Filter to Image blocks with image_url
  const imageBlocks = blockIds
    .map(id => loadBlock(id))
    .filter((b): b is ExportedBlock => b !== null && b.class === 'Image' && !!b.image_url);

  console.log(`   Found ${imageBlocks.length} image blocks to process`);

  // Filter already enriched (unless force)
  const blocksToProcess = forceReenrich
    ? imageBlocks
    : imageBlocks.filter(b => !b.vision);

  console.log(`   To enrich: ${blocksToProcess.length} blocks`);

  if (blocksToProcess.length === 0) {
    console.log('\n✅ All blocks already enriched. Use --force to re-enrich.');
    return;
  }

  // Process blocks
  console.log(`\n🚀 Starting enrichment...\n`);

  let enriched = 0;
  let errors = 0;

  for (let i = 0; i < blocksToProcess.length; i++) {
    const block = blocksToProcess[i];
    const progress = `[${i + 1}/${blocksToProcess.length}]`;

    console.log(`${progress} Block ${block.id}: ${block.title?.slice(0, 40) || '(no title)'}...`);

    if (dryRun) {
      console.log(`   🔍 Would analyze: ${block.image_url?.slice(0, 60)}...`);
      continue;
    }

    try {
      // Analyze with Gemini
      const vision = await analyzeImage(genAI, block.image_url!, block.content);

      // Update block
      block.vision = vision;
      saveBlock(block);

      console.log(`   ✅ "${vision.suggested_title}"`);
      console.log(`      Tags: ${vision.tags.slice(0, 5).join(', ')}${vision.tags.length > 5 ? '...' : ''}`);

      enriched++;

      // Update state
      state.enrichment!.total_enriched++;
      state.enrichment!.last_enriched_at = new Date().toISOString();

      // Track per-channel progress
      for (const ch of block.channels) {
        if (!state.enrichment!.channels_enriched[ch]) {
          state.enrichment!.channels_enriched[ch] = {
            total: 0,
            enriched: 0,
            last_block_id: null,
          };
        }
        state.enrichment!.channels_enriched[ch].enriched++;
        state.enrichment!.channels_enriched[ch].last_block_id = block.id;
      }

      // Save state after each block (resilience)
      saveState(state);

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      errors++;
    }

    // Rate limit
    if (i < blocksToProcess.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         COMPLETE                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📊 Summary:`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total enriched (all time): ${state.enrichment!.total_enriched}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
