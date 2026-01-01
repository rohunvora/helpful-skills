#!/usr/bin/env npx ts-node
/**
 * Are.na Incremental Block Exporter
 *
 * Exports all blocks from all channels with:
 * - Incremental fetching (never re-downloads existing data)
 * - Local image storage
 * - Resume support (interruption-safe)
 * - Backfill mode for historical data
 *
 * Usage:
 *   npx ts-node export-blocks.ts                  # Incremental update
 *   npx ts-node export-blocks.ts --backfill      # Fetch older blocks
 *   npx ts-node export-blocks.ts --full          # Full re-export (skip existing)
 *   npx ts-node export-blocks.ts --channel=slug  # Export specific channel
 *   npx ts-node export-blocks.ts --images        # Also download images
 *
 * Environment:
 *   ARENA_TOKEN      - Are.na API token (required)
 *   ARENA_USER_SLUG  - Your Are.na username (required)
 *   ARENA_EXPORT_DIR - Export directory (default: ./arena-export)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ARENA_TOKEN = process.env.ARENA_TOKEN!;
const ARENA_USER_SLUG = process.env.ARENA_USER_SLUG!;
const ARENA_API_BASE = 'https://api.are.na/v2';

const EXPORT_DIR = process.env.ARENA_EXPORT_DIR || path.join(process.cwd(), 'arena-export');
const STATE_FILE = path.join(EXPORT_DIR, 'state.json');
const BLOCKS_DIR = path.join(EXPORT_DIR, 'blocks');
const IMAGES_DIR = path.join(EXPORT_DIR, 'images');
const CHANNELS_FILE = path.join(EXPORT_DIR, 'channels.json');

const PER_PAGE = 100;
const RATE_LIMIT_MS = 200; // Be nice to Are.na API

// ============================================================================
// TYPES
// ============================================================================

interface ArenaBlock {
  id: number;
  title: string | null;
  updated_at: string;
  created_at: string;
  class: string;
  base_class: string;
  content: string | null;
  content_html: string | null;
  description: string | null;
  description_html: string | null;
  source: { url: string } | null;
  image: {
    filename: string;
    content_type: string;
    original: { url: string };
    display: { url: string };
    thumb: { url: string };
  } | null;
  attachment: {
    url: string;
    file_name: string;
    content_type: string;
  } | null;
  embed: {
    url: string;
    type: string;
    html: string;
  } | null;
}

interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  length: number;
  status: string;
  updated_at: string;
  created_at: string;
}

interface ChannelState {
  slug: string;
  title: string;
  // Two watermarks pattern
  newest_id: number | null;  // For fetching new blocks
  oldest_id: number | null;  // For backfilling old blocks
  // Progress tracking
  total_exported: number;
  last_updated: string;
  fully_backfilled: boolean;
}

interface ExportState {
  user_slug: string;
  channels: Record<string, ChannelState>;
  last_channels_fetch: string | null;
  created_at: string;
  updated_at: string;
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
  channels: string[];  // Channel slugs this block appears in
  exported_at: string;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function loadState(): ExportState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    user_slug: ARENA_USER_SLUG,
    channels: {},
    last_channels_fetch: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
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

// ============================================================================
// API HELPERS
// ============================================================================

async function arenaFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${ARENA_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${ARENA_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 429) {
    // Rate limited - wait and retry
    const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
    console.log(`   ⏳ Rate limited, waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return arenaFetch(endpoint);
  }

  if (!res.ok) {
    throw new Error(`Are.na API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function fetchChannels(): Promise<ArenaChannel[]> {
  const allChannels: ArenaChannel[] = [];
  let page = 1;

  while (true) {
    const data = await arenaFetch<{ channels: ArenaChannel[] }>(
      `/users/${ARENA_USER_SLUG}/channels?per=${PER_PAGE}&page=${page}`
    );

    if (!data.channels || data.channels.length === 0) break;

    allChannels.push(...data.channels);
    console.log(`   📂 Fetched ${allChannels.length} channels...`);

    if (data.channels.length < PER_PAGE) break;
    page++;
    await sleep(RATE_LIMIT_MS);
  }

  return allChannels;
}

async function fetchChannelBlocks(
  slug: string,
  page: number = 1
): Promise<{ blocks: ArenaBlock[]; hasMore: boolean }> {
  const data = await arenaFetch<{ contents: ArenaBlock[]; length: number }>(
    `/channels/${slug}/contents?per=${PER_PAGE}&page=${page}`
  );

  const blocks = (data.contents || []).filter(b => b.class !== 'Channel');
  const hasMore = blocks.length === PER_PAGE;

  return { blocks, hasMore };
}

async function downloadImage(url: string, blockId: number): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png'
              : contentType.includes('gif') ? 'gif'
              : contentType.includes('webp') ? 'webp'
              : 'jpg';

    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = `${blockId}.${ext}`;
    const filepath = path.join(IMAGES_DIR, filename);

    fs.writeFileSync(filepath, buffer);
    return filename;
  } catch (err) {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// EXPORT LOGIC
// ============================================================================

function convertBlock(block: ArenaBlock, channelSlug: string): ExportedBlock {
  const existing = loadBlock(block.id);
  const channels = existing?.channels || [];
  if (!channels.includes(channelSlug)) {
    channels.push(channelSlug);
  }

  return {
    id: block.id,
    title: block.title,
    class: block.class,
    created_at: block.created_at,
    updated_at: block.updated_at,
    content: block.content,
    description: block.description,
    source_url: block.source?.url || null,
    image_url: block.image?.original?.url || block.image?.display?.url || null,
    image_local: existing?.image_local || null,
    attachment_url: block.attachment?.url || null,
    embed_url: block.embed?.url || null,
    channels,
    exported_at: new Date().toISOString(),
  };
}

async function exportChannel(
  channel: ArenaChannel,
  state: ExportState,
  options: { backfill?: boolean; downloadImages?: boolean }
): Promise<{ newBlocks: number; updatedBlocks: number }> {
  const channelState = state.channels[channel.slug] || {
    slug: channel.slug,
    title: channel.title,
    newest_id: null,
    oldest_id: null,
    total_exported: 0,
    last_updated: new Date().toISOString(),
    fully_backfilled: false,
  };

  let newBlocks = 0;
  let updatedBlocks = 0;
  let page = 1;

  // Track watermarks for this run
  let runNewestId: number | null = null;
  let runOldestId: number | null = null;

  console.log(`\n📁 ${channel.title} (${channel.slug})`);
  console.log(`   Length: ${channel.length} blocks`);

  if (options.backfill && channelState.fully_backfilled) {
    console.log(`   ✅ Already fully backfilled, skipping`);
    return { newBlocks: 0, updatedBlocks: 0 };
  }

  while (true) {
    const { blocks, hasMore } = await fetchChannelBlocks(channel.slug, page);

    if (blocks.length === 0) break;

    // Process each block immediately (save after each page for resilience)
    for (const block of blocks) {
      // Track watermarks
      if (runNewestId === null || block.id > runNewestId) {
        runNewestId = block.id;
      }
      if (runOldestId === null || block.id < runOldestId) {
        runOldestId = block.id;
      }

      // Skip if already exported (unless updating channels list)
      const existing = loadBlock(block.id);
      const exported = convertBlock(block, channel.slug);

      if (existing) {
        // Update channels list if block exists in new channel
        if (!existing.channels.includes(channel.slug)) {
          saveBlock(exported);
          updatedBlocks++;
        }
      } else {
        // New block - download image if requested
        if (options.downloadImages && exported.image_url) {
          const localImage = await downloadImage(exported.image_url, block.id);
          exported.image_local = localImage;
        }

        saveBlock(exported);
        newBlocks++;
      }
    }

    console.log(`   Page ${page}: +${blocks.length} blocks (${newBlocks} new, ${updatedBlocks} updated)`);

    if (!hasMore) {
      // Reached end of channel - mark as fully backfilled
      channelState.fully_backfilled = true;
      break;
    }

    // In backfill mode, stop if we've reached already-exported blocks
    if (options.backfill && channelState.oldest_id !== null) {
      const reachedExisting = blocks.some(b => b.id <= channelState.oldest_id!);
      if (reachedExisting) {
        console.log(`   ✅ Reached existing data, stopping backfill`);
        break;
      }
    }

    page++;
    await sleep(RATE_LIMIT_MS);
  }

  // Update watermarks ONLY after successful completion
  if (runNewestId !== null) {
    if (channelState.newest_id === null || runNewestId > channelState.newest_id) {
      channelState.newest_id = runNewestId;
    }
  }
  if (runOldestId !== null) {
    if (channelState.oldest_id === null || runOldestId < channelState.oldest_id) {
      channelState.oldest_id = runOldestId;
    }
  }

  channelState.total_exported += newBlocks;
  channelState.last_updated = new Date().toISOString();
  state.channels[channel.slug] = channelState;

  return { newBlocks, updatedBlocks };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('              ARE.NA INCREMENTAL BLOCK EXPORTER                 ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Parse args
  const args = process.argv.slice(2);
  const backfill = args.includes('--backfill');
  const full = args.includes('--full');
  const downloadImages = args.includes('--images');
  const channelArg = args.find(a => a.startsWith('--channel='));
  const targetChannel = channelArg?.split('=')[1];

  console.log(`Mode: ${backfill ? 'BACKFILL' : full ? 'FULL' : 'INCREMENTAL'}`);
  console.log(`Images: ${downloadImages ? 'YES' : 'NO'}`);
  if (targetChannel) console.log(`Channel: ${targetChannel}`);

  // Validate env
  if (!ARENA_TOKEN || !ARENA_USER_SLUG) {
    console.error('\n❌ Missing ARENA_TOKEN or ARENA_USER_SLUG in .env');
    process.exit(1);
  }

  // Ensure directories exist
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  fs.mkdirSync(BLOCKS_DIR, { recursive: true });
  if (downloadImages) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Load state
  const state = loadState();
  console.log(`\n📊 Export directory: ${EXPORT_DIR}`);
  console.log(`   Existing channels tracked: ${Object.keys(state.channels).length}`);

  // Fetch channels
  console.log('\n📂 Fetching channels...');
  const channels = await fetchChannels();
  console.log(`   Found ${channels.length} channels`);

  // Save channels list
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
  state.last_channels_fetch = new Date().toISOString();

  // Filter to target channel if specified
  const channelsToExport = targetChannel
    ? channels.filter(c => c.slug === targetChannel)
    : channels.filter(c => c.length > 0);

  if (targetChannel && channelsToExport.length === 0) {
    console.error(`\n❌ Channel not found: ${targetChannel}`);
    process.exit(1);
  }

  console.log(`\n🚀 Exporting ${channelsToExport.length} channels...\n`);

  // Export each channel
  let totalNew = 0;
  let totalUpdated = 0;

  for (const channel of channelsToExport) {
    try {
      const { newBlocks, updatedBlocks } = await exportChannel(
        channel,
        state,
        { backfill, downloadImages }
      );
      totalNew += newBlocks;
      totalUpdated += updatedBlocks;

      // Save state after each channel (resilience)
      saveState(state);
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
      // Save state even on error
      saveState(state);
    }
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         COMPLETE                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📊 Summary:`);
  console.log(`   New blocks exported: ${totalNew}`);
  console.log(`   Blocks updated: ${totalUpdated}`);
  console.log(`   Total blocks on disk: ${fs.readdirSync(BLOCKS_DIR).length}`);
  console.log(`   Channels tracked: ${Object.keys(state.channels).length}`);
  console.log(`\n📁 Export location: ${EXPORT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
