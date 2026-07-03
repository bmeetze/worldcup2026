#!/bin/zsh
# Run by launchd (com.bmeetze.worldcup2026.refresh) once a day.
# Pulls the football-data.org token from Keychain so it never lives in plaintext.
set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"
cd "/Users/brandonmeetze/World Cup App"

TOKEN="$(security find-generic-password -a "$USER" -s "worldcup2026-football-data-token" -w)"
FOOTBALL_DATA_TOKEN="$TOKEN" node refresh-scores.mjs
