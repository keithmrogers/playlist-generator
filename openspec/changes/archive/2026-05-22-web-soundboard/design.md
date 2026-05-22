## Context

The current app is a single Node.js process with an Ink terminal UI that directly drives Discord and YouTube services. Playlist generation (Spotify + Last.fm + LLM) is interleaved in the same process. The new architecture separates UI (browser) from the persistent backend process (server), with the server holding the long-lived Discord bot connection.

## Goals / Non-Goals

**Goals:**
- Replace Ink CLI with a browser-accessible HTTP server
- Persistent Discord bot connection for the lifetime of the container (no reconnect delay on mood switch)
- Mobile-first UI operable with one hand at the table
- Immediate cut when switching playlists (no fade)
- Secrets managed via Podman secrets or env file — never baked into the image
- Self-contained Podman container (Node + yt-dlp + ffmpeg)

**Non-Goals:**
- Playlist creation or editing (handled separately via Claude agent)
- Authentication / access control (LAN-only deployment)
- Multiple simultaneous streams / true soundboard mixing
- Crossfade between playlists
- Volume control

## Decisions

### 1. Express over a more exotic framework
Plain Express is already a transitive dependency of several packages in the tree, is well-understood, and adds no build complexity. A more capable framework (Fastify, Hono) offers no meaningful benefit for this API surface.

### 2. Server-Sent Events over WebSocket for real-time status
SSE is one-way (server → client), which is all that's needed for now-playing updates. It requires no extra library, works natively in browsers, and reconnects automatically. WebSocket would add complexity with no benefit here.

### 3. Vanilla HTML/CSS/JS frontend served by Express (no frontend build step)
The UI is a single page with ~6 buttons and a status strip. A React/Vite build pipeline would be disproportionate. Static files served from `src/public/` keeps the container build simple and eliminates a separate frontend build step.

**Alternative considered:** React + Vite — rejected because it adds a build step and npm workspace complexity for a UI this simple.

### 4. Immediate cut on playlist switch (no fade)
D&D sessions require fast reactions. Fading is pleasant but adds latency and implementation complexity. `player.stop()` then immediately playing the new resource is the simplest correct behaviour.

### 5. Podman env file for secrets (primary), Podman secrets as alternative
An env file (`--env-file .env`) is the simplest approach and works in both Podman and Docker. Podman secrets (`--secret`) are more secure but require extra setup. The `Containerfile` will document both patterns; the app itself just reads `process.env` and is agnostic.

**Secret vars required:** `DISCORD_TOKEN`, `DISCORD_VOICE_CHANNEL_ID`
**No longer needed:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `LASTFM_API_KEY`

### 6. Server entry point replaces CLI entry point
`src/server.ts` becomes the new entry point. It initialises `DiscordService`, mounts Express routes, and starts listening. `cli.tsx` and the Ink dependency tree are deleted entirely.

### 7. Playlist shuffle on each play, cut on switch
When a mood button is tapped: stop the current audio player, pick the target playlist, shuffle its tracks, start playing track 0. The shuffle is in-memory per play session — playlist files are never mutated.

## Risks / Trade-offs

- **yt-dlp binary in container** → Keep yt-dlp pinned to a specific version in the `Containerfile` and document update procedure. YouTube breakage is possible but unrelated to this change.
- **Discord bot stays connected indefinitely** → Container restart reconnects cleanly; `DiscordService.destroy()` is called on `SIGTERM`. Acceptable for home-server deployment.
- **No auth on web UI** → Intentional; LAN-only. Document in README that the port should not be exposed publicly.
- **Static frontend has no hot-reload** → Developer experience trade-off accepted; the UI is small enough to iterate quickly with a container restart.

## Migration Plan

1. Delete removed source files and dependencies
2. Add `express` and `@types/express`
3. Write `src/server.ts` entry point
4. Write `src/public/index.html` + `src/public/app.js` + `src/public/style.css`
5. Add API routes (playlists, play, pause, resume, skip, status SSE)
6. Write `Containerfile`
7. Write `.env.example` documenting required vars
8. Update `CLAUDE.md` and `README.md`
9. Update `package.json` scripts (`build`, `start`)

Rollback: the deleted code is in git history on `add-remote-config`; no database migrations involved.

## Open Questions

- Should the playlist folder be watched for changes (inotify) so new playlists appear without a container restart, or is a manual restart acceptable? (Assumption: manual restart is fine for now.)
