#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

module_id=$(jq -er '.id | select(test("^[a-z0-9]+(-[a-z0-9]+)*$"))' module.json)
version=$(jq -er '.version | select(test("^[0-9]+\\.[0-9]+\\.[0-9]+$"))' module.json)
if [[ "${RELEASE_TAG:?Set RELEASE_TAG}" != "v$version" ]]; then
  echo "Release tag must match module version v$version." >&2
  exit 1
fi
repository_url=${REPOSITORY_URL:?Set REPOSITORY_URL}
archive="$module_id-$version.zip"

stage=$(mktemp -d)
trap 'find "$stage" -depth -delete' EXIT
mkdir -p dist "$stage/$module_id"
jq --arg url "$repository_url" \
  --arg readme "$repository_url/blob/$RELEASE_TAG/README.md" \
  --arg manifest "$repository_url/releases/latest/download/module.json" \
  --arg download "$repository_url/releases/download/$RELEASE_TAG/$archive" \
  '. + {url: $url, readme: $readme, manifest: $manifest, download: $download}' module.json > "$stage/$module_id/module.json"
cp "$stage/$module_id/module.json" dist/module.json
for directory in scripts styles lang; do
  if [[ -d "$directory" ]]; then
    cp -R "$directory" "$stage/$module_id/"
  fi
done
(cd "$stage" && zip -qr "$archive" "$module_id")
mv "$stage/$archive" "dist/$archive"
