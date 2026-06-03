#!/usr/bin/env bash
# Dump all fields of every root collection as CSV (nested objects -> JSON cells).
#
# The token is read from the plugin's gitignored data.json — do NOT hardcode
# it here: this script IS committed to git.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAINDROP_TOKEN="$(jq -r '.raindropAccessToken' "$SCRIPT_DIR/data.json")"
if [ -z "$RAINDROP_TOKEN" ] || [ "$RAINDROP_TOKEN" = "null" ]; then
	echo "No raindropAccessToken found in $SCRIPT_DIR/data.json" >&2
	exit 1
fi

# Root collections
curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
	"https://api.raindrop.io/rest/v1/collections" |
	jq -r '
    (.items[0] | keys_unsorted) as $cols
    | ($cols | @csv),
      (.items[] | [ .[$cols[]] | if type=="object" or type=="array" then tojson else . end ] | @csv)
  '
