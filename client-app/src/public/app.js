const grid = document.getElementById('mood-grid');
const emptyMsg = document.getElementById('empty-msg');
const nowPlayingLabel = document.getElementById('now-playing-label');
const nowPlayingTrack = document.getElementById('now-playing-track');
const btnPauseResume = document.getElementById('btn-pause-resume');
const btnSkip = document.getElementById('btn-skip');

let paused = false;
let activePlaylistName = null;

// --- Render mood buttons ---

async function loadPlaylists() {
  const res = await fetch('/playlists');
  const items = await res.json();
  grid.querySelectorAll('.mood-btn').forEach(b => b.remove());
  if (items.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;
  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'mood-btn';
    btn.dataset.name = item.name;
    btn.innerHTML = `${item.name}<span class="track-count">${item.trackCount} tracks</span>`;
    btn.addEventListener('click', () => playPlaylist(item.name));
    grid.appendChild(btn);
  }
}

function setActiveButton(name) {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.name === name);
  });
}

// --- Playback controls ---

async function playPlaylist(name) {
  await fetch(`/play/${encodeURIComponent(name)}`, { method: 'POST' });
}

btnPauseResume.addEventListener('click', async () => {
  if (paused) {
    await fetch('/resume', { method: 'POST' });
  } else {
    await fetch('/pause', { method: 'POST' });
  }
});

btnSkip.addEventListener('click', () => fetch('/skip', { method: 'POST' }));

// --- SSE status updates ---

function connectSSE() {
  const es = new EventSource('/status');
  es.onmessage = (e) => {
    const state = JSON.parse(e.data);
    updateUI(state);
  };
  es.onerror = () => {
    // EventSource reconnects automatically
  };
}

function updateUI(state) {
  activePlaylistName = state.playlistName;
  setActiveButton(activePlaylistName);

  if (!state.playlistName) {
    nowPlayingLabel.textContent = 'No playlist selected';
    nowPlayingTrack.textContent = '';
    btnPauseResume.hidden = true;
    btnSkip.hidden = true;
    return;
  }

  const isPlaying = state.playerStatus === 'playing';
  const isPaused = state.playerStatus === 'paused';
  paused = isPaused;

  const trackNum = `${state.trackIndex + 1}/${state.totalTracks}`;
  nowPlayingLabel.textContent = `${state.playlistName}  ·  ${trackNum}`;

  if (state.track) {
    const artists = state.track.artists?.join(', ') ?? '';
    nowPlayingTrack.textContent = artists
      ? `${state.track.name} — ${artists}`
      : state.track.name;
  } else {
    nowPlayingTrack.textContent = 'Loading...';
  }

  btnPauseResume.hidden = false;
  btnSkip.hidden = false;
  btnPauseResume.textContent = isPaused ? '▶' : '⏸';
}

// --- Init ---

loadPlaylists();
connectSSE();
