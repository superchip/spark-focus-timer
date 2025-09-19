#!/usr/bin/env bash
set -euo pipefail

# Package Spark Focus Timer extension for Chrome Web Store
# Usage: ./package_extension.sh [version]
# If version omitted, reads from manifest.json

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

version="${1:-}"
if [[ -z "$version" ]]; then
  version=$(grep -o '"version" *: *"[0-9.]*"' manifest.json | sed -E 's/.*"([0-9.]+)"/\1/')
fi

if [[ -z "$version" ]]; then
  echo "Could not determine version" >&2
  exit 1
fi

OUT_DIR="dist"
mkdir -p "$OUT_DIR"
ZIP_NAME="spark-focus-timer-${version}.zip"
ZIP_PATH="${OUT_DIR}/${ZIP_NAME}"

echo "Packaging Spark Focus Timer v${version} -> ${ZIP_PATH}";

# Build exclusion patterns
# Exclude dev/test/docs not needed for store submission
EXCLUDES=(
  ".git" ".github" "node_modules" "test_results" \
  "*.py" "pyproject.toml" "*DEBUG*" "TESTING.md" "TROUBLESHOOTING.md" \
  "debug-*.js" "debug-test.js" "debug-console.js" "main.py" \
  "STORE_LISTING_DRAFT.md" "README.md" "PRIVACY_POLICY.md" \
  "package_extension.sh"
)

# Create a temp file list
TMP_FILE_LIST=$(mktemp)
trap 'rm -f "$TMP_FILE_LIST"' EXIT

# Find all files and filter excludes
while IFS= read -r f; do
  skip=false
  for pat in "${EXCLUDES[@]}"; do
    if [[ "$f" == $pat || "$f" == */$pat ]]; then
      skip=true; break
    fi
    # Glob matching
    if [[ $pat == *'*'* ]]; then
      if [[ $(basename "$f") == $pat ]]; then
        skip=true; break
      fi
    fi
  done
  if ! $skip; then
    echo "$f" >> "$TMP_FILE_LIST"
  fi
done < <(find . -type f ! -path './dist/*')

# Create zip
( cd . && zip -q -@ "$ZIP_PATH" < "$TMP_FILE_LIST" )

# Basic validation: ensure manifest present in zip
if ! unzip -l "$ZIP_PATH" | grep -q 'manifest.json'; then
  echo "ERROR: manifest.json missing from zip" >&2
  exit 2
fi

echo "Created ${ZIP_PATH}";
ls -lh "$ZIP_PATH"
