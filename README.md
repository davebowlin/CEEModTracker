# Conan Exiles Enhanced Mod Tracker

Tracks Steam Workshop mods for Conan Exiles Enhanced compatibility.

## Features

- Mobile-first PWA UI with Conan-inspired dark fantasy theme
- Steam Workshop metadata sync (title, description, last updated, subscriptions, etc.)
- Full workshop discovery mode for Conan Exiles (requires Steam Web API key)
- Compatibility classifier: `Enhanced`, `Likely Compatible`, `Legacy`
- Automatic recurring sync job
- REST API endpoint at `/api/mods`
- PM2 + nginx deployment support for VPS
- Windows GUI deploy tool for upload/update workflows

## Local setup

1. Copy `.env.example` to `.env`
   - Set `STEAM_API_KEY` to enable full auto-discovery of all Conan workshop mods.
   - Keep `WORKSHOP_DISCOVERY_MODE=all` to retrieve the full catalog and filter to UE5/Enhanced-compatible mods.
   - Set `ADMIN_SYNC_PASSWORD` to protect the manual **Sync Now** action from public use.
2. Install dependencies:
   - `npm install`
3. Start development server:
   - `npm run dev`
4. Open: `http://localhost:8000`

## Build and run production

- Build: `npm run build`
- Start: `npm run start`

## Tests

- `npm run test`

## VPS deployment (GUI)

1. Run PowerShell:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\deploy-gui.ps1`
2. Fill host/user/key/path
3. Click **Deploy / Update**

The GUI script uploads files, runs `npm ci`, builds, reloads PM2, and applies nginx config.

## License

The Unlicense