# Community Modernization

This project is being moved from a single-admin panel to a community-ready
administration platform.

## Phase 1 - Security Foundation

Implemented:

- Basic RBAC layer in `lib/security`.
- Configurable users and roles through `config.security`.
- Route-level permission checks.
- Server ownership field persisted in `servers.json`.
- Audit log writer in `audit.json`.
- Mission ZIP upload endpoint.
- Dependency security cleanup: `npm audit` currently reports 0 vulnerabilities.

Default roles:

- `admin`: all permissions.
- `operator`: mission list and mission upload only.
- `user`: server list and server start only.

Relevant permissions:

- `servers.view`
- `servers.create`
- `servers.edit`
- `servers.delete`
- `servers.start`
- `servers.stop`
- `missions.view`
- `missions.upload`
- `missions.delete`
- `mods.view`
- `mods.import`
- `mods.delete`
- `logs.view`
- `logs.delete`
- `settings.view`
- `settings.edit`
- `audit.view`
- `jobs.view`
- `users.view`
- `users.create`
- `users.edit`
- `users.delete`

## Server Ownership

Each server can now contain:

```json
{
  "owner": {
    "username": "davide"
  }
}
```

When security is enabled, non-admin users cannot access a server owned by a
different user. Admins still bypass ownership restrictions.

Users can also be restricted to explicit server IDs:

```js
security: {
  users: [
    {
      username: 'user',
      password: 'change-me',
      roles: ['user'],
      serverIds: ['public-server']
    }
  ]
}
```

## Mission ZIP Upload

Endpoint:

```text
POST /api/missions/zip
```

Form field:

```text
missionZip
```

Only `.pbo` files are extracted. Internal archive paths are ignored and each
mission is written by basename into the configured `mpmissions` folder.

## Next Phases

Recommended order:

1. Add a real login/session UI instead of relying only on Basic Auth.
2. Add an admin screen for users, groups, roles, and server ownership.
3. Move persistence from JSON files to SQLite or PostgreSQL.
4. Add richer operational checks around real Arma server start/stop failures.
5. Add backup/restore tooling for the runtime JSON state until database persistence lands.

## Dependency Notes

The legacy `steam-workshop` dependency was removed because it pulled the
deprecated `request` stack and had no safe audit fix. The old Workshop mission
download method now returns HTTP 410. Upload mission PBO/ZIP files instead.

FAST HTML mod preset import is implemented through SteamCMD and runs as a
tracked background job. Steam Guard should be handled through the separate
SteamCMD login action before starting a large import.

Major upgrades already applied:

- Bootstrap 5
- Gamedig 5
- Socket.IO 4
- Webpack 5
- Webpack Dev Middleware 8
- Multer 2
- Standard 17
- Mocha 11 with patched transitive overrides
- Passport/Steam OpenID session auth
- FAST HTML preset parsing
- SteamCMD Workshop mod download/deploy jobs

Compatibility fixes applied after the upgrades:

- Added `public/js/app/marionette-legacy.js` to provide the Marionette 2 APIs used by the old views on top of the updated stack.
- Replaced the old RequireJS entrypoint with a Webpack/CommonJS entrypoint that starts the router on DOM ready.
- Replaced the old Bootstrap 3 jQuery modal dependency with `public/js/app/bootstrap-modal.js`.
- Migrated the main navigation template to Bootstrap 5 navbar attributes/classes.
- Switched HTML template loading to Webpack 5 `asset/source`.

## Steam Authentication

Steam OpenID is the intended login source. The unique user identifier is
SteamID64, stored as `steamId` on users.

Implemented backend endpoints:

- `GET /auth/steam`
- `GET /auth/steam/return`
- `POST /auth/logout`
- `GET /api/me`

Config keys:

```js
steamAuth: {
  enabled: true,
  baseUrl: 'http://localhost:3000',
  sessionSecret: 'change-me',
  apiKey: ''
}
```

Users can be mapped like this:

```js
security: {
  users: [
    {
      username: 'davide',
      steamId: '7656119...',
      roles: ['admin']
    }
  ]
}
```

## Current Operational Status

- Automated `npm run check` passes: lint, unit tests, Webpack build, and
  Playwright smoke test.
- `npm audit` reports 0 vulnerabilities.
- Real server start with selected mods has been validated on the local Arma 3
  server path.
- Remaining production hardening item: replace JSON persistence with a database
  once multiple admins or long-term community usage require stronger
  concurrency and backup behavior.
