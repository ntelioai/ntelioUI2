#!/bin/bash
# Dev server for client-side debugging
# Ships with the client-debug skill
#
# Usage: ./serve.sh [root_dir] [port]
#   root_dir: Directory to serve (default: current directory)
#   port:     Port number (default: 8765)
#
# Examples:
#   ./serve.sh /Volumes/dev/ntelioUI          # Serve ntelioUI on 8765
#   ./serve.sh /Volumes/dev/commerceGenie 9000 # Serve commerceGenie on 9000
#   ./serve.sh                                 # Serve current directory on 8765

PORT=${2:-8765}
DIR="${1:-.}"

# Resolve to absolute path
DIR="$(cd "$DIR" 2>/dev/null && pwd)" || { echo "❌ Directory not found: $1"; exit 1; }

# Check if already running
if lsof -ti:$PORT &>/dev/null; then
    echo "✓ Server already running on port $PORT"
    echo "  http://localhost:$PORT/"
    exit 0
fi

echo "Starting dev server..."
echo "  Root: $DIR"
echo "  URL:  http://localhost:$PORT/"
echo ""
echo "Press Ctrl+C to stop."
cd "$DIR" && python3 -m http.server $PORT