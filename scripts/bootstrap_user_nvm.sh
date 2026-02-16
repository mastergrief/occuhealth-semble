#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"

TARGET_USER=""
PASSWORDLESS_SUDO="true"
NODE_VERSION="22"
INSTALL_CLIS="none"
DRY_RUN="false"
TARGET_HOME=""
TARGET_SHELL=""

log() {
  echo "[INFO] $*"
}

warn() {
  echo "[WARN] $*" >&2
}

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage:
  $SCRIPT_NAME --user <name> [options]

Options:
  --user <name>                     Target username (required)
  --passwordless-sudo <true|false>  Configure NOPASSWD sudo (default: true)
  --node-version <version>          Node version for nvm install (default: 22)
  --install-clis <mode>             One of: none, vercel, vercel,claude (default: none)
  --dry-run                         Print actions without changing the system
  --help                            Show this help text

Examples:
  sudo $SCRIPT_NAME --user handoff
  sudo $SCRIPT_NAME --user ci --passwordless-sudo false --node-version 22
  sudo $SCRIPT_NAME --user handoff --install-clis vercel,claude
EOF
}

run_cmd() {
  if [[ "$DRY_RUN" == "true" ]]; then
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

run_as_user() {
  local script="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    printf '[dry-run] su - %s -s /bin/bash -c %q\n' "$TARGET_USER" "bash -lc $script"
    return
  fi
  su - "$TARGET_USER" -s /bin/bash -c "bash -lc $(printf '%q' "$script")"
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: $cmd"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --user)
        [[ $# -ge 2 ]] || die "--user requires a value"
        TARGET_USER="$2"
        shift 2
        ;;
      --passwordless-sudo)
        [[ $# -ge 2 ]] || die "--passwordless-sudo requires true or false"
        PASSWORDLESS_SUDO="$2"
        shift 2
        ;;
      --node-version)
        [[ $# -ge 2 ]] || die "--node-version requires a value"
        NODE_VERSION="$2"
        shift 2
        ;;
      --install-clis)
        [[ $# -ge 2 ]] || die "--install-clis requires a value"
        INSTALL_CLIS="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

validate_args() {
  [[ -n "$TARGET_USER" ]] || die "--user is required"
  [[ "$TARGET_USER" =~ ^[a-z_][a-z0-9_-]*[$]?$ ]] || die "Invalid username: $TARGET_USER"

  case "$PASSWORDLESS_SUDO" in
    true|false) ;;
    *) die "--passwordless-sudo must be true or false" ;;
  esac

  [[ "$NODE_VERSION" =~ ^[a-zA-Z0-9._-]+$ ]] || die "Invalid --node-version value: $NODE_VERSION"

  case "$INSTALL_CLIS" in
    none|vercel|vercel,claude) ;;
    *) die "--install-clis must be one of: none, vercel, vercel,claude" ;;
  esac
}

check_root() {
  [[ "${EUID:-$(id -u)}" -eq 0 ]] || die "This script must run as root (use sudo)."
}

check_distro() {
  [[ -f /etc/os-release ]] || die "/etc/os-release not found"
  # shellcheck disable=SC1091
  source /etc/os-release
  local id="${ID:-}"
  local like="${ID_LIKE:-}"
  if [[ "$id" != "ubuntu" && "$id" != "debian" && "$like" != *debian* ]]; then
    die "Unsupported distro ($id). This script targets Ubuntu/Debian."
  fi
}

preflight_checks() {
  require_command useradd
  require_command usermod
  require_command getent
  require_command visudo
  require_command curl
  require_command git
  require_command su
  require_command id
}

ensure_user() {
  local user_exists="false"
  if getent passwd "$TARGET_USER" >/dev/null 2>&1; then
    user_exists="true"
    log "User $TARGET_USER already exists."
  else
    log "Creating user $TARGET_USER."
    run_cmd useradd -m -s /bin/bash "$TARGET_USER"
  fi

  if [[ "$user_exists" == "false" && "$DRY_RUN" == "true" ]]; then
    TARGET_HOME="/home/$TARGET_USER"
    TARGET_SHELL="/bin/bash"
    warn "Dry-run mode: simulating new user with home $TARGET_HOME and shell $TARGET_SHELL"
    return
  fi

  local passwd_entry
  passwd_entry="$(getent passwd "$TARGET_USER")"
  TARGET_HOME="$(echo "$passwd_entry" | cut -d: -f6)"
  TARGET_SHELL="$(echo "$passwd_entry" | cut -d: -f7)"

  [[ -n "$TARGET_HOME" ]] || die "Could not determine home directory for $TARGET_USER"

  if [[ ! -d "$TARGET_HOME" ]]; then
    warn "Home directory $TARGET_HOME missing; creating it."
    run_cmd mkdir -p "$TARGET_HOME"
    run_cmd chown "$TARGET_USER:$TARGET_USER" "$TARGET_HOME"
  fi

  if [[ "$TARGET_SHELL" != "/bin/bash" ]]; then
    warn "User shell is $TARGET_SHELL (expected /bin/bash). Continuing."
  fi
}

ensure_sudo_group_membership() {
  getent group sudo >/dev/null 2>&1 || die "sudo group not found on this system."

  if ! getent passwd "$TARGET_USER" >/dev/null 2>&1; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log "Dry-run mode: simulating sudo group assignment for $TARGET_USER."
      run_cmd usermod -aG sudo "$TARGET_USER"
      return
    fi
    die "User $TARGET_USER not found while setting sudo group membership."
  fi

  if id -nG "$TARGET_USER" | tr ' ' '\n' | grep -qx "sudo"; then
    log "User $TARGET_USER is already in sudo group."
  else
    log "Adding $TARGET_USER to sudo group."
    run_cmd usermod -aG sudo "$TARGET_USER"
  fi
}

configure_passwordless_sudo() {
  local sudoers_file="/etc/sudoers.d/90-${TARGET_USER}-nopasswd"
  local rule="${TARGET_USER} ALL=(ALL) NOPASSWD:ALL"

  if [[ "$PASSWORDLESS_SUDO" != "true" ]]; then
    if [[ -f "$sudoers_file" ]]; then
      warn "Passwordless sudo disabled; leaving existing $sudoers_file unchanged."
    else
      log "Passwordless sudo disabled; skipping sudoers setup."
    fi
    return
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] Would write $sudoers_file with: $rule"
    return
  fi

  local tmp
  tmp="$(mktemp)"
  printf '%s\n' "$rule" > "$tmp"
  chmod 0440 "$tmp"
  chown root:root "$tmp"

  if ! visudo -cf "$tmp" >/dev/null; then
    rm -f "$tmp"
    die "Generated sudoers content is invalid for $TARGET_USER"
  fi

  mv "$tmp" "$sudoers_file"
  if ! visudo -cf "$sudoers_file" >/dev/null; then
    die "Final sudoers validation failed for $sudoers_file"
  fi

  log "Configured passwordless sudo for $TARGET_USER."
}

append_block_if_missing() {
  local file="$1"
  local marker="$2"
  local block="$3"

  if [[ -f "$file" ]] && grep -Fq "$marker" "$file"; then
    log "Block already present in $file"
    return
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] Would append nvm block to $file"
    return
  fi

  touch "$file"
  printf '\n%s\n' "$block" >> "$file"
  chown "$TARGET_USER:$TARGET_USER" "$file"
}

configure_shell_startup() {
  local profile_file="$TARGET_HOME/.profile"
  local bashrc_file="$TARGET_HOME/.bashrc"

  local profile_block
  profile_block="$(cat <<'EOF'
# >>> nvm bootstrap profile >>>
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi
# <<< nvm bootstrap profile <<<
EOF
)"

  local bashrc_block
  bashrc_block="$(cat <<'EOF'
# >>> nvm bootstrap bashrc >>>
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
# <<< nvm bootstrap bashrc <<<
EOF
)"

  append_block_if_missing "$profile_file" "# >>> nvm bootstrap profile >>>" "$profile_block"
  append_block_if_missing "$bashrc_file" "# >>> nvm bootstrap bashrc >>>" "$bashrc_block"
}

install_nvm() {
  local nvm_install_url="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh"
  local install_cmd
  install_cmd="if [ -s \"\$HOME/.nvm/nvm.sh\" ]; then echo \"nvm already installed.\"; else curl -fsSL \"$nvm_install_url\" | bash; fi"

  log "Installing nvm for $TARGET_USER (if missing)."
  run_as_user "$install_cmd"
  run_as_user "test -s \"\$HOME/.nvm/nvm.sh\""
}

cleanup_npm_prefix() {
  local npmrc="$TARGET_HOME/.npmrc"

  if [[ ! -f "$npmrc" ]]; then
    log "No $npmrc found; skipping npm prefix cleanup."
    return
  fi

  if ! grep -Eq '^[[:space:]]*prefix[[:space:]]*=' "$npmrc"; then
    log "No npm prefix override found in $npmrc"
    return
  fi

  local backup="${npmrc}.backup-before-nvm-$(date +%Y%m%d%H%M%S)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[dry-run] Would back up $npmrc to $backup and remove prefix lines."
    return
  fi

  cp "$npmrc" "$backup"
  chown "$TARGET_USER:$TARGET_USER" "$backup"

  local tmp
  tmp="$(mktemp)"
  grep -Ev '^[[:space:]]*prefix[[:space:]]*=' "$npmrc" > "$tmp" || true
  if [[ -s "$tmp" ]]; then
    mv "$tmp" "$npmrc"
    chown "$TARGET_USER:$TARGET_USER" "$npmrc"
  else
    rm -f "$npmrc" "$tmp"
  fi

  log "Removed npm prefix override from $npmrc"
}

install_node() {
  local cmd
  cmd="export NVM_DIR=\"\$HOME/.nvm\"; . \"\$NVM_DIR/nvm.sh\"; nvm install \"$NODE_VERSION\"; nvm alias default \"$NODE_VERSION\"; nvm use default"
  log "Installing Node $NODE_VERSION and setting nvm default."
  run_as_user "$cmd"
}

install_optional_clis() {
  case "$INSTALL_CLIS" in
    none)
      log "Skipping optional global CLI installs."
      ;;
    vercel)
      log "Installing Vercel CLI for $TARGET_USER."
      run_as_user "export NVM_DIR=\"\$HOME/.nvm\"; . \"\$NVM_DIR/nvm.sh\"; nvm use default >/dev/null; npm install -g vercel; vercel --version"
      ;;
    vercel,claude)
      log "Installing Vercel and Claude Code CLIs for $TARGET_USER."
      run_as_user "export NVM_DIR=\"\$HOME/.nvm\"; . \"\$NVM_DIR/nvm.sh\"; nvm use default >/dev/null; npm install -g vercel @anthropic-ai/claude-code; vercel --version; claude --version"
      ;;
  esac
}

print_summary() {
  local sudoers_file="/etc/sudoers.d/90-${TARGET_USER}-nopasswd"
  echo
  echo "Bootstrap complete:"
  echo "  user: $TARGET_USER"
  echo "  home: $TARGET_HOME"
  echo "  passwordless_sudo: $PASSWORDLESS_SUDO"
  if [[ -f "$sudoers_file" ]]; then
    echo "  sudoers_file: $sudoers_file"
  else
    echo "  sudoers_file: (not configured)"
  fi
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  node/npm status: (dry-run, not executed)"
    return
  fi

  run_as_user "export NVM_DIR=\"\$HOME/.nvm\"; . \"\$NVM_DIR/nvm.sh\"; nvm use default >/dev/null; echo \"  node: \$(node -v)\"; echo \"  npm: \$(npm -v)\"; echo \"  node_path: \$(which node)\"; echo \"  npm_prefix: \$(npm config get prefix)\"; echo \"  npm_root_g: \$(npm root -g)\""
}

main() {
  parse_args "$@"
  validate_args
  check_root
  check_distro
  preflight_checks

  ensure_user
  ensure_sudo_group_membership
  configure_passwordless_sudo
  install_nvm
  configure_shell_startup
  cleanup_npm_prefix
  install_node
  install_optional_clis
  print_summary
}

main "$@"
