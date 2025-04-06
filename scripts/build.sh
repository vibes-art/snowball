#!/usr/bin/env bash
#
# build.sh
# Usage: ./build.sh <project-name>
# Example: ./build.sh website
#
# This script:
# 1) Creates (or overwrites) a "build" folder in the project directory.
# 2) Reads index.html, inlining <script src="..."> tags with the actual JS content.
# 3) Copies all non-JS files into build/.

# Exit if any command fails
set -e

# 1) Grab the project name from the first argument
PROJECT_NAME="$1"
if [ -z "$PROJECT_NAME" ]; then
  echo "Error: No project name specified."
  echo "Usage: ./build.sh <project-name>"
  exit 1
fi

PROJECT_DIR="projects/$PROJECT_NAME"
SRC_INDEX="$PROJECT_DIR/index.html"
BUILD_DIR="$PROJECT_DIR/build"

# Make sure the project index.html actually exists
if [ ! -f "$SRC_INDEX" ]; then
  echo "Error: $SRC_INDEX not found."
  exit 1
fi

# 2) Create or overwrite the build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# We'll write our transformed index.html here
OUT_INDEX="$BUILD_DIR/index.html"

INJECTED_ENV_SCRIPT=false

# 3) Read index.html and replace <script src="..."> lines with inline script tags
while IFS= read -r line; do

  # If we encounter <head>, print it and immediately inject our environment script
  if [[ $line == *"<head>"* && $INJECTED_ENV_SCRIPT == false ]]; then
    echo "$line" >> "$OUT_INDEX"

    # Inject a small script that sets window.IS_PROD and ROOT_PATH
    echo "<script>" >> "$OUT_INDEX"
    echo "  window.IS_PROD = true;" >> "$OUT_INDEX"
    echo "</script>" >> "$OUT_INDEX"
    echo "" >> "$OUT_INDEX"

    INJECTED_ENV_SCRIPT=true
    continue
  fi

  # Check if the line looks like <script src="some.js"></script>
  # This pattern captures the path in group 1
  if [[ $line =~ ^[[:space:]]*\<script\ src=\"([^\"]+)\"\>\</script\> ]]; then
    JS_PATH="${BASH_REMATCH[1]}"

    # Echo an inline script tag
    echo "<script>" >> "$OUT_INDEX"
    echo "/* SOURCE: $JS_PATH */" >> "$OUT_INDEX"

    # Cat the JS file contents directly. 
    # Note: JS_PATH is likely relative to the project folder.
    cat "$JS_PATH" >> "$OUT_INDEX"

    echo "</script>" >> "$OUT_INDEX"
    echo "" >> "$OUT_INDEX"
  else
    # Otherwise, write the original line as-is
    echo "$line" >> "$OUT_INDEX"
  fi
done < "$SRC_INDEX"

# 4) Copy all non-JS files (images, HTML, etc.) except index.html and *.js
# into the build directory. That way, everything else remains the same.
rsync -av \
  --exclude='index.html' \
  --exclude='*.js' \
  --exclude='build/' \
  --exclude='scripts/' \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='.DS_STORE' \
  --exclude='Thumbs.db' \
  "$PROJECT_DIR/" "$BUILD_DIR/"

echo "Build complete. See: $BUILD_DIR/index.html"
