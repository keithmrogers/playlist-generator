// Quick local audio test — bypasses Discord, plays through speakers via ffplay.
// Usage: node test-stream.mjs "track name artist"
// Example: node test-stream.mjs "Lag Fyrir Ommu Olafur Arnalds"

import youtubedl from 'youtube-dl-exec';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const YTDLP_BIN = require.resolve('youtube-dl-exec/bin/yt-dlp');

const query = process.argv.slice(2).join(' ') || 'Olafur Arnalds Near Light';
console.log(`Searching for: "${query}"`);

// 1. Search
let result;
try {
  result = await youtubedl.exec(query.replace(/:/g, ' '), {
    dumpSingleJson: true,
    defaultSearch: 'ytsearch1',
    quiet: true,
    jsRuntimes: `node:${process.execPath}`,
  });
} catch (err) {
  console.error('Search failed:', err.message);
  process.exit(1);
}

const parsed = JSON.parse(result.stdout);
const video = parsed?.entries?.[0];
if (!video) { console.error('No results found'); process.exit(1); }
console.log(`Found: "${video.title}"\n  URL: ${video.webpage_url}`);

// 2. Stream yt-dlp → ffplay
console.log('\nStreaming to speakers via ffplay (Ctrl+C to stop)...');
const ytProc = spawn(YTDLP_BIN, [
  video.webpage_url,
  '-o', '-',
  '-f', 'bestaudio/best',
  '--quiet',
  '--no-playlist',
  '--js-runtimes', `node:${process.execPath}`,
], { stdio: ['ignore', 'pipe', 'pipe'] });

ytProc.on('error', e => { console.error('yt-dlp error:', e.message); process.exit(1); });
ytProc.stderr.on('data', d => console.error('[yt-dlp stderr]', d.toString().trim()));

const ffplay = spawn('ffplay', ['-nodisp', '-autoexit', '-loglevel', 'warning', '-'], {
  stdio: ['pipe', 'inherit', 'inherit'],
});

ffplay.on('error', e => { console.error('ffplay error:', e.message); process.exit(1); });
ffplay.on('close', code => { console.log(`\nffplay exited (${code})`); ytProc.kill(); });
ytProc.stdout.pipe(ffplay.stdin);

ytProc.on('close', code => {
  if (code !== 0 && code !== null) console.error(`yt-dlp exited with code ${code}`);
});
