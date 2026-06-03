#!/usr/bin/env bash
# List Raindrop collections (root + nested) as id / title / parent.
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

# Root collections (parent is always null)
curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
	"https://api.raindrop.io/rest/v1/collections" |
	jq -c '.items[] | {id: ._id, title, parent: null}'

# Nested (child) collections — parent.$id points at the containing collection
curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
	"https://api.raindrop.io/rest/v1/collections/childrens" |
	jq -c '.items[] | {id: ._id, title, parent: (.parent["$id"] // null)}'
