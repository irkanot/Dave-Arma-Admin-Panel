# Upstream and attribution

Dave Arma Admin Panel is a modified derivative of:

- Project: `Dahlgren/arma-server-web-admin`
- Upstream repository: https://github.com/Dahlgren/arma-server-web-admin
- Upstream description: Web based server manager for Arma
- Upstream license: MIT

The original `LICENSE` file and copyright notice are preserved in this
repository. The MIT License permits modification and redistribution provided
that its copyright and permission notices remain included.

## Changes in this derivative

This derivative adds or substantially changes:

- Steam OpenID-only dashboard authentication using SteamID64;
- users, roles, permissions, server ownership and audit logging;
- Windows installer and service lifecycle tooling;
- SteamCMD login, FAST HTML imports and Workshop validation/update jobs;
- mission ZIP/PBO upload and persistent background jobs;
- configurable global server prefix;
- local and online release manifests, SHA-256 verification, backup, update,
  restart and rollback support;
- modernized frontend dependencies, build, lint, tests and security fixes.

These modifications are maintained independently and are not endorsed by the
upstream author.
