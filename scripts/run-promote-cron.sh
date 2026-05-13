#!/usr/bin/env bash
# run-promote-cron.sh — env-safe wrapper around `pnpm promote-generated`
# for cron / systemd timer invocation.
#
# What it handles:
#   - cron's bare PATH (no ~/.local/bin, no node, no pnpm)
#   - Working directory must be the project root for `pnpm` to find the
#     workspace and the relative paths inside the script
#   - Append-only logging with a timestamp header per invocation
#   - Single-instance lock so an overlapping cron run can't double-write
#
# Cron entry (see docs/automation/CRON_SETUP.md):
#   0 6 * * *  /absolute/path/to/polyglyph/scripts/run-promote-cron.sh
#
# Configure via environment variables before invoking:
#   POLYGLYPH_ROOT  — absolute path to the project root (required)
#   POLYGLYPH_STAGING — staging directory to promote from (optional;
#                       passes through to `pnpm promote-generated`)

set -euo pipefail

# --- Configuration -----------------------------------------------------------

PROJECT_ROOT="${POLYGLYPH_ROOT:?POLYGLYPH_ROOT must be set to the project root}"
LOG_FILE="${PROJECT_ROOT}/logs/promote-cron.log"
LOCK_FILE="/tmp/polyglyph-promote.lock"

# pnpm is typically in ~/.local/bin; cron doesn't inherit your shell PATH.
export PATH="${HOME}/.local/bin:/usr/local/bin:/usr/bin:/bin"

# --- Setup -------------------------------------------------------------------

mkdir -p "$(dirname "$LOG_FILE")"

# Single-instance lock via flock — silently exit if another run is active.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -Iseconds)] another instance is running — exiting" >>"$LOG_FILE"
  exit 0
fi

# --- Run ---------------------------------------------------------------------

cd "$PROJECT_ROOT"

{
  echo ""
  echo "==============================================="
  echo "[$(date -Iseconds)] cron promote starting"
  echo "PATH=$PATH"
  echo "PWD=$(pwd)"
  echo "pnpm=$(command -v pnpm || echo NOT-FOUND)"
  echo "-----------------------------------------------"
} >>"$LOG_FILE"

# Optional --staging-dir override from POLYGLYPH_STAGING env var.
STAGING_ARGS=()
if [ -n "${POLYGLYPH_STAGING:-}" ]; then
  STAGING_ARGS=("--staging-dir" "${POLYGLYPH_STAGING}")
fi

# Run, capturing both stdout and stderr to the log.
# --stable-after 120 means files must be ≥ 2 minutes idle (so a session
#   that finished writing 1 min ago still has time to flush). 0600 cron is
#   well past any normal authoring window, so this is just belt-and-braces.
# --archive moves promoted dialogues into _promoted/<date>/.
# --quiet keeps log noise low when nothing changed.
if pnpm promote-generated "${STAGING_ARGS[@]}" --stable-after 120 --archive --quiet >>"$LOG_FILE" 2>&1; then
  echo "[$(date -Iseconds)] cron promote OK" >>"$LOG_FILE"
else
  rc=$?
  echo "[$(date -Iseconds)] cron promote FAILED (exit $rc)" >>"$LOG_FILE"
  exit $rc
fi
