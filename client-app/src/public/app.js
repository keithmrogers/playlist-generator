const modePicker      = document.getElementById('mode-picker');
const modeChip        = document.getElementById('mode-chip');
const nowPlayingLabel = document.getElementById('now-playing-label');
const nowPlayingTrack = document.getElementById('now-playing-track');
const bufferingBadge  = document.getElementById('buffering-badge');
const btnPauseResume  = document.getElementById('btn-pause-resume');
const btnSkip         = document.getElementById('btn-skip');
const localAudio      = document.getElementById('local-audio');

const STORAGE_KEY = 'playback-mode';
let activeMode = null;
let paused = false;
let activePlaylistName = null;

// --- Buffering timer ---

let bufferingStart = null;
let bufferingTimer = null;

function startBufferingTimer() {
  if (bufferingTimer) return;
  bufferingStart = Date.now();
  bufferingBadge.hidden = false;
  bufferingBadge.textContent = 'Buffering 0s';
  bufferingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - bufferingStart) / 1000);
    bufferingBadge.textContent = `Buffering ${elapsed}s`;
  }, 1000);
}

function stopBufferingTimer() {
  if (!bufferingTimer) return;
  clearInterval(bufferingTimer);
  bufferingTimer = null;
  bufferingStart = null;
  bufferingBadge.hidden = true;
}

// --- Mode picker ---

function showSoundboard(mode, animate = true) {
  activeMode = mode;
  modeChip.textContent = mode === 'local' ? 'Local Audio' : 'Discord Bot';
  if (animate) {
    modePicker.classList.add('dismissed');
  } else {
    modePicker.style.display = 'none';
  }
}

const savedMode = sessionStorage.getItem(STORAGE_KEY);
if (savedMode) {
  showSoundboard(savedMode, false);
}

modeChip.addEventListener('click', async () => {
  if (activeMode === 'discord') {
    await fetch('/disconnect-discord', { method: 'POST' });
  } else if (activeMode === 'local') {
    localAudio.pause();
    localAudio.src = '';
  }
  sessionStorage.removeItem(STORAGE_KEY);
  activeMode = null;
  modePicker.style.display = '';
  modePicker.classList.remove('dismissed');
});

document.querySelectorAll('.mode-opt-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const mode = btn.dataset.mode;

    if (mode === 'discord') {
      const label = btn.querySelector('.mode-opt-label');
      const orig = label.textContent;
      label.textContent = 'Connecting…';
      btn.disabled = true;
      try {
        const res = await fetch('/connect-discord', { method: 'POST' });
        if (!res.ok) throw new Error('connect failed');
      } catch {
        label.textContent = orig;
        btn.disabled = false;
        return;
      }
    }

    sessionStorage.setItem(STORAGE_KEY, mode);
    showSoundboard(mode, true);
  });
});

// --- Mood buttons ---

function setActiveButton(name) {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.name === name);
  });
}

function setLoadingButton(name) {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('loading', btn.dataset.name === name);
  });
}

function flashError(name) {
  const btn = document.querySelector(`.mood-btn[data-name="${name}"]`);
  if (!btn) return;
  btn.classList.remove('error');
  void btn.offsetWidth;
  btn.classList.add('error');
  btn.addEventListener('animationend', () => btn.classList.remove('error'), { once: true });
}

async function playPlaylist(name) {
  if (activeMode === 'local') {
    localAudio.src = `/stream/${encodeURIComponent(name)}`;
    try {
      await localAudio.play();
    } catch {
      flashError(name);
    }
  } else {
    const res = await fetch(`/play/${encodeURIComponent(name)}`, { method: 'POST' });
    if (!res.ok) flashError(name);
  }
}

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => playPlaylist(btn.dataset.name));
});

// --- Playback controls ---

btnPauseResume.addEventListener('click', async () => {
  if (activeMode === 'local') {
    if (paused) {
      await localAudio.play();
    } else {
      localAudio.pause();
    }
    paused = !paused;
    btnPauseResume.textContent = paused ? '▶' : '⏸';
  } else {
    if (paused) {
      await fetch('/resume', { method: 'POST' });
    } else {
      await fetch('/pause', { method: 'POST' });
    }
  }
});

btnSkip.addEventListener('click', async () => {
  if (activeMode === 'local') {
    await fetch('/skip?local=1', { method: 'POST' });
    if (activePlaylistName) {
      localAudio.src = `/stream/${encodeURIComponent(activePlaylistName)}`;
      try { await localAudio.play(); } catch { /* ignore */ }
    }
  } else {
    await fetch('/skip', { method: 'POST' });
  }
});

// --- SSE status updates ---

function connectSSE() {
  const es = new EventSource('/status');
  es.onmessage = (e) => {
    const state = JSON.parse(e.data);
    updateUI(state);
  };
  es.onerror = () => {};
}

function updateUI(state) {
  activePlaylistName = state.playlistName;
  setActiveButton(activePlaylistName);

  if (!state.playlistName) {
    nowPlayingLabel.textContent = 'No playlist selected';
    nowPlayingTrack.textContent = '';
    btnPauseResume.hidden = true;
    btnSkip.hidden = true;
    stopBufferingTimer();
    setLoadingButton(null);
    return;
  }

  const isBuffering = state.loading || state.playerStatus === 'buffering';

  if (isBuffering) {
    startBufferingTimer();
    setLoadingButton(activePlaylistName);
  } else {
    stopBufferingTimer();
    setLoadingButton(null);
  }

  const isPaused = state.playerStatus === 'paused';

  if (activeMode !== 'local') {
    paused = isPaused;
    btnPauseResume.textContent = isPaused ? '▶' : '⏸';
  }

  const trackNum = `${state.trackIndex + 1}/${state.totalTracks}`;
  nowPlayingLabel.textContent = `${state.playlistName}  ·  ${trackNum}`;

  if (state.track) {
    const artists = state.track.artists?.join(', ') ?? '';
    nowPlayingTrack.textContent = artists
      ? `${state.track.name} — ${artists}`
      : state.track.name;
  } else {
    nowPlayingTrack.textContent = '';
  }

  btnPauseResume.hidden = false;
  btnSkip.hidden = false;
}

// --- Init ---

connectSSE();
