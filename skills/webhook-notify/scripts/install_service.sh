#!/bin/bash
# Install webhook notification listener as macOS background service
#
# Usage: install_service.sh <path-to-plist>
#
# Example:
#   install_service.sh ~/.claude/webhooks/stripe-payments/com.webhook.stripe-payments.plist

set -e

PLIST_PATH="$1"

if [[ -z "$PLIST_PATH" ]]; then
    echo "Usage: install_service.sh <path-to-plist>"
    echo ""
    echo "Example:"
    echo "  install_service.sh ~/.claude/webhooks/stripe-payments/com.webhook.stripe-payments.plist"
    exit 1
fi

if [[ ! -f "$PLIST_PATH" ]]; then
    echo "❌ Error: plist file not found: $PLIST_PATH"
    exit 1
fi

PLIST_NAME=$(basename "$PLIST_PATH")
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
DEST_PATH="$LAUNCH_AGENTS_DIR/$PLIST_NAME"

echo "🔧 Installing webhook notification service..."
echo "   Source: $PLIST_PATH"
echo "   Destination: $DEST_PATH"
echo ""

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Copy plist file
cp "$PLIST_PATH" "$DEST_PATH"

# Unload if already loaded (ignore errors)
launchctl unload "$DEST_PATH" 2>/dev/null || true

# Load the service
launchctl load "$DEST_PATH"

echo "✅ Service installed and started!"
echo ""
echo "📋 Useful commands:"
echo ""
echo "Check if running:"
echo "  launchctl list | grep $(basename "$PLIST_NAME" .plist)"
echo ""
echo "View logs:"
echo "  tail -f $(dirname "$PLIST_PATH")/logs/*.log"
echo ""
echo "Restart service:"
echo "  launchctl unload $DEST_PATH && launchctl load $DEST_PATH"
echo ""
echo "Stop service:"
echo "  launchctl unload $DEST_PATH"
echo ""
echo "Uninstall service:"
echo "  launchctl unload $DEST_PATH && rm $DEST_PATH"
echo ""
