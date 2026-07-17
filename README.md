# Dave Arma Admin Panel

> [!IMPORTANT]
> This project is a modified derivative of
> [Dahlgren/arma-server-web-admin](https://github.com/Dahlgren/arma-server-web-admin),
> originally distributed under the MIT License. The original copyright and
> license notices are preserved. This derivative is not affiliated with or
> endorsed by the original author.

Dave Arma Admin Panel modernizes the upstream project with Steam-only
authentication, role-based access control, audit logging, Windows deployment,
SteamCMD Workshop management and signed-hash automatic updates.

The stable update feed is published through GitHub Releases:
`https://github.com/irkanot/Dave-Arma-Admin-Panel/releases/latest/download/latest.json`.

See [UPSTREAM.md](UPSTREAM.md) for provenance and the distinction between the
original project and this derivative.

[![Build Status](https://travis-ci.org/Dahlgren/arma-server-web-admin.svg?branch=master)](https://travis-ci.org/Dahlgren/arma-server-web-admin)

A community-ready web admin panel for Arma servers.

[Screenshots](http://imgur.com/a/Xod6U)

## Features

- Create multiple instances of game servers in the same admin panel
- See server status queryed from the instances with current mission and players
- Download game logs
- Upload mission PBO files and ZIP archives from your local computer
- Import FAST-style HTML mod presets
- Download and deploy Steam Workshop mods through SteamCMD
- Track long-running imports and SteamCMD login attempts through Jobs
- Manage users, SteamID64 mappings, groups/roles, permissions, and server ownership
- Sign in with Steam OpenID
- Review audit logs for administrative actions

## Current Status

- Local automated check passes with lint, unit tests, Webpack build, and Playwright smoke test.
- `npm audit` reports 0 vulnerabilities.
- Real Arma 3 server start with selected mods has been validated on the configured local server path.
- Legacy Workshop mission download was removed with the old `steam-workshop` integration; upload PBO/ZIP missions instead.

## Requirements

- Node.js, https://nodejs.org/
- Pre-installed Arma Server

## Supported Platforms

- Windows
- Linux
- Linux with Windows binary using Wine

## Supported Games

- arma1
- arma2
- arma2oa
- arma3
- arma3_x64
- cwa (does not support linux)
- ofp
- ofpresistance

## Config

Key | Description
--- | ---
game | Which game server to launch, see above
path | Folder path to game server
port | Web port to use
host | IP or Hostname to listen on
type | Which kind of server to use, can be 'linux', 'windows' or 'wine'
additionalConfigurationOptions | Additional configuration options appended to server.cfg file
parameters | Extra startup parameters added to servers and headless clients
serverMods | Mods that always and only will be used by the game servers
steamAuth | Steam OpenID configuration; this is the only dashboard login method
prefix | Text prepended to all game servers name
suffix | Text appended to all game servers name

Additional local runtime settings can be edited from the Admin -> Settings modal:

Key | Description
--- | ---
Dashboard login | Always uses Steam OpenID and cannot be disabled
Steam base URL | Public URL used for Steam OpenID return URLs
Session secret | Secret used to sign web sessions
Steam API key | Optional Steam Web API key
SteamCMD path | Path to `steamcmd.exe` or its containing folder
Steam username/password | Account used by SteamCMD for Workshop downloads
Steam Guard code | One-time runtime code for the next SteamCMD action; not persisted

Runtime settings are saved in `settings.json`. Keep this file private because it can contain local SteamCMD credentials.

## How to Use

For a full Windows bundle, use `INSTALL.md`. The bundle includes Node.js MSI,
SteamCMD ZIP, `node_modules`, and built frontend assets.

Manual/source install:

1. Copy `config.js.example` to `config.js`

2. Change values in `config.js` as described above or in the file

3. Install all dependencies with `npm install`

4. Launch the web UI with `npm start` or install as a Windows Service with `npm run install-windows-service`

5. Open the dashboard, go to Admin -> Settings, and confirm the Arma server path and SteamCMD path.

6. Use Admin to map users to SteamID64 values and assign roles.

7. For Workshop mods, run Login SteamCMD first, approve Steam Guard if needed, then import the FAST HTML preset from Mods.

## Quality Checks

```sh
npm run check
npm audit --audit-level=moderate
```

## System Configuration

### Windows

Make sure to disable Windows Error Reporting or server control will be stuck on a server crash.

Install as a Windows Service with `npm run install-windows-service`.

Remove previously installed Windows Service with `npm run uninstall-windows-service`.

### Wine

Make sure to disable Wine GUI Crash Dialog or server control will be stuck on a server crash.
This is easiest solved using `winetricks` by running `winetricks nocrashdialog`.
It can also be disabled manually.
[Read more at Wine FAQ](http://wiki.winehq.org/FAQ#head-c857c433cf9fc1dcd90b8369ef75c325483c91d6).

## Docker

### Example

To host an Arma 3 x64 server with an existing Arma 3 Server install in subfolder `arma3` with persisted profiles in `profiles` and shared network with host,

```sh
mkdir -p arma3 profiles
touch servers.json
docker run \
  --network=host \
  --env GAME_TYPE=arma3_x64 \
  --env GAME_PATH=/arma3 \
  --volume $PWD/arma3:/arma3 \
  --volume $PWD/servers.json:/app/servers.json \
  --volume $PWD/profiles:"/root/.local/share/Arma 3 - Other Profiles" \
  dahlgren/arma-server-web-admin
```

### Required setup

Mount a preinstalled Arma server folder to the container, currently only the linux server is supported.
Set GAME_TYPE to your desired arma server, for example `--env GAME_TYPE=arma3` or `--env GAME_TYPE=arma3_x64`.
Set GAME_PATH to your mounted volume, for example `--env GAME_PATH=/arma3` and `--volume $PWD/arma3:/arma3`.

### Networking
Host preferably needs to share network with the container or all game ports used will need to be forwarded to the container.
Use `--network=host` to use same network as the host machine.

Web Admin UI is available at port 3000.
If you use `--network=host` you can reach the web ui at `http://localhost:3000` by default.

### Persistence

#### Servers

Mount a file at `/app/servers.json` to persist the servers config.
For example `--volume $PWD/servers.json:/app/servers.json` to use a file named `servers.json` in current folder as persistent servers config file.

#### Profiles

If you need to persist the server profiles such as vars file make sure to mount a volume.
For Arma 3 the default profiles directory will be located at `/root/.local/share/Arma 3 - Other Profiles`

### Environment Variables

Key | Description
--- | ---
GAME_PATH | Required. Absolute folder path to game server in docker container
GAME_TYPE | Required. Type of game server, see above
STEAM_AUTH_BASE_URL | Public URL used for the Steam OpenID callback
SESSION_SECRET | Secret used to sign dashboard sessions
STEAM_API_KEY | Optional Steam Web API key
SERVER_ADMINS | Steam IDs that should be set as admins
SERVER_ADDITIONAL_CONFIG | Additional content to add into server.cfg
SERVER_MODS | Mods to be loaded as server side only mods
SERVER_PARAMETERS | Additional parameters to pass on server launch
SERVER_PREFIX | Prefix on all server names
SERVER_SUFFIX | Suffix on all server names
