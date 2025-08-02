import path from 'path';

// Path to the playlists folder (default to 'playlists' or override via PLAYLIST_FOLDER env var)
export const PLAYLIST_FOLDER = process.env['PLAYLIST_FOLDER'] || path.join(process.cwd(), 'playlists');
