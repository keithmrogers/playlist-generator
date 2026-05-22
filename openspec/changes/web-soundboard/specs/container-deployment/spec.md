## ADDED Requirements

### Requirement: Containerfile builds a self-contained image
The repository SHALL include a `Containerfile` that produces an image containing Node.js, yt-dlp, and ffmpeg with no external runtime dependencies.

#### Scenario: Image build succeeds
- **WHEN** `podman build -t soundboard .` is run from the repo root
- **THEN** the build completes without error and the resulting image can start the server

#### Scenario: yt-dlp and ffmpeg available in container
- **WHEN** the container starts
- **THEN** both `yt-dlp` and `ffmpeg` are on `PATH` inside the container

### Requirement: Secrets supplied via env file (primary method)
The container SHALL accept credentials via an env file passed to `--env-file`, and the image SHALL NOT contain any secret values.

#### Scenario: Env file provided
- **WHEN** the container is started with `podman run --env-file .env soundboard`
- **THEN** `DISCORD_TOKEN` and `DISCORD_VOICE_CHANNEL_ID` are available to the server process

#### Scenario: Secret values absent from image
- **WHEN** the image is inspected (e.g., `podman inspect`)
- **THEN** no secret values appear in the image metadata or layers

### Requirement: Secrets supported via Podman secrets (alternative method)
The `Containerfile` and run instructions SHALL document how to use `podman secret` as an alternative to the env file.

#### Scenario: Podman secret used for DISCORD_TOKEN
- **WHEN** `DISCORD_TOKEN` is stored as a Podman secret and the container is started with `--secret discord_token,type=env,target=DISCORD_TOKEN`
- **THEN** the server receives the token correctly via `process.env.DISCORD_TOKEN`

### Requirement: Playlists directory mounted as a volume
The container SHALL read playlists from a host directory mounted at runtime, not baked into the image.

#### Scenario: Volume mount provided
- **WHEN** the container is started with `-v /host/path/to/playlists:/app/playlists`
- **THEN** the server loads playlists from the mounted directory

#### Scenario: PLAYLIST_FOLDER override
- **WHEN** the `PLAYLIST_FOLDER` env var is set to a custom path
- **THEN** the server reads playlists from that path instead of the default `./playlists`

### Requirement: Web port exposed and documented
The container SHALL expose the HTTP server port and the run instructions SHALL document the port mapping.

#### Scenario: Default port
- **WHEN** the container is started with `-p 3000:3000`
- **THEN** the soundboard UI is accessible at `http://<server-ip>:3000` from the local network

### Requirement: env.example documents all required variables
The repository SHALL include a `.env.example` file listing every required and optional environment variable with descriptions.

#### Scenario: New user setup
- **WHEN** a user copies `.env.example` to `.env` and fills in their values
- **THEN** running the container with `--env-file .env` produces a working deployment

### Requirement: Graceful container stop
The container SHALL stop cleanly within the default Podman stop timeout (10 seconds).

#### Scenario: podman stop called
- **WHEN** `podman stop <container>` is run
- **THEN** the server receives `SIGTERM`, disconnects from Discord, and exits within 10 seconds without requiring `SIGKILL`
