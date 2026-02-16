# Bootstrap Guide

## Linux User + NVM Bootstrap Utility
This repository includes a Linux user/bootstrap utility at:

- `scripts/bootstrap_user_nvm.sh`

Purpose:
- Create or configure a dedicated user account.
- Optionally grant passwordless sudo (`NOPASSWD:ALL`).
- Install user-level `nvm` in `~/.nvm`.
- Install and default Node `22` under that user.
- Keep npm global installs user-scoped (remove conflicting `prefix=` in `~/.npmrc`).

## Typical Usage
```bash
sudo scripts/bootstrap_user_nvm.sh --user <username>
```

## Optional Examples
```bash
sudo scripts/bootstrap_user_nvm.sh --user <username> --passwordless-sudo false
sudo scripts/bootstrap_user_nvm.sh --user <username> --install-clis vercel
sudo scripts/bootstrap_user_nvm.sh --user <username> --install-clis vercel,claude
sudo scripts/bootstrap_user_nvm.sh --user <username> --dry-run
```

## Notes
- This script must be run as root (use `sudo`).
- Supported targets are Debian/Ubuntu-family systems.
- CLI install modes supported by `--install-clis` are `none`, `vercel`, and `vercel,claude`.
- Override Node version with `--node-version <version>` when needed.
