#!/bin/bash
# Dev server for ntelioUI2 - run once, leave running
# Usage: ./serve.sh [port]
# Default: http://localhost:8765

PORT=${1:-8765}
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Check if already running
if lsof -ti:$PORT &>/dev/null; then
    echo "✓ Server already running on port $PORT"
    echo "  http://localhost:$PORT/ntelioUI2/examples/"
    exit 0
fi

echo "Starting ntelioUI dev server on port $PORT..."
echo "  Root: $DIR"
echo "  Examples: http://localhost:$PORT/ntelioUI2/examples/"
echo "  Widget Basics: http://localhost:$PORT/ntelioUI2/examples/core/widget-basics/"
echo ""
echo "Press Ctrl+C to stop."
cd "$DIR" && python3 -m http.server $PORT
