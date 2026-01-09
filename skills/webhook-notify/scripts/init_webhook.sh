#!/bin/bash
# Initialize a new webhook notification system
#
# Usage: init_webhook.sh <webhook-name> <ntfy-topic> [output-dir] [sound-file]
#
# Arguments:
#   webhook-name: Name for this webhook (e.g., "stripe-payments", "github-prs")
#   ntfy-topic: Your ntfy.sh topic name (e.g., "myapp-notifications")
#   output-dir: Optional. Directory to create files in (default: ~/.claude/webhooks/<webhook-name>)
#   sound-file: Optional. Path to custom notification sound (default: system sound)
#
# Example:
#   init_webhook.sh stripe-payments satoshi-stripe-kaching
#   init_webhook.sh github-alerts my-github-topic ~/webhooks /path/to/sound.mp3

set -e

WEBHOOK_NAME="$1"
NTFY_TOPIC="$2"
OUTPUT_DIR="${3:-$HOME/.claude/webhooks/$WEBHOOK_NAME}"
SOUND_FILE="${4:-/System/Library/Sounds/Glass.aiff}"

if [[ -z "$WEBHOOK_NAME" || -z "$NTFY_TOPIC" ]]; then
    echo "Usage: init_webhook.sh <webhook-name> <ntfy-topic> [output-dir] [sound-file]"
    echo ""
    echo "Example:"
    echo "  init_webhook.sh stripe-payments satoshi-stripe-kaching"
    exit 1
fi

echo "🚀 Initializing webhook notification: $WEBHOOK_NAME"
echo "   Topic: ntfy.sh/$NTFY_TOPIC"
echo "   Output: $OUTPUT_DIR"
echo ""

# Create directory structure
mkdir -p "$OUTPUT_DIR/webhook"
mkdir -p "$OUTPUT_DIR/logs"

# Get template directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES_DIR="$SKILL_DIR/assets"

# Generate worker.js
echo "📝 Creating Cloudflare Worker..."
sed "s/{{NTFY_TOPIC}}/$NTFY_TOPIC/g" "$TEMPLATES_DIR/worker-template.js" > "$OUTPUT_DIR/webhook/worker.js"

# Create wrangler.toml
cat > "$OUTPUT_DIR/webhook/wrangler.toml" << EOF
name = "$WEBHOOK_NAME"
main = "worker.js"
compatibility_date = "2024-01-01"

# Deploy with: cd webhook && npx wrangler deploy
# Set secret: npx wrangler secret put WEBHOOK_SECRET
EOF

# Generate listener.sh
echo "📝 Creating listener script..."
sed -e "s|{{NTFY_TOPIC}}|$NTFY_TOPIC|g" \
    -e "s|{{WEBHOOK_NAME}}|$WEBHOOK_NAME|g" \
    -e "s|{{SOUND_FILE}}|$SOUND_FILE|g" \
    -e "s|{{LOG_FILE}}|$OUTPUT_DIR/logs/listener.log|g" \
    "$TEMPLATES_DIR/listener-template.sh" > "$OUTPUT_DIR/listener.sh"

chmod +x "$OUTPUT_DIR/listener.sh"

# Generate launchd plist
echo "📝 Creating launchd service configuration..."
LABEL="com.webhook.$WEBHOOK_NAME"
sed -e "s|{{LABEL}}|$LABEL|g" \
    -e "s|{{LISTENER_PATH}}|$OUTPUT_DIR/listener.sh|g" \
    -e "s|{{STDOUT_LOG}}|$OUTPUT_DIR/logs/stdout.log|g" \
    -e "s|{{STDERR_LOG}}|$OUTPUT_DIR/logs/stderr.log|g" \
    "$TEMPLATES_DIR/launchd-template.plist" > "$OUTPUT_DIR/$LABEL.plist"

echo ""
echo "✅ Webhook notification system initialized!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Deploy the Cloudflare Worker:"
echo "   cd $OUTPUT_DIR/webhook"
echo "   npx wrangler deploy"
echo ""
echo "2. Configure your webhook to send to:"
echo "   https://$WEBHOOK_NAME.YOUR-SUBDOMAIN.workers.dev/webhook"
echo ""
echo "3. Install the listener as a background service:"
echo "   $SKILL_DIR/scripts/install_service.sh $OUTPUT_DIR/$LABEL.plist"
echo ""
echo "4. (Optional) Test the listener manually:"
echo "   $OUTPUT_DIR/listener.sh"
echo ""
echo "5. (Optional) Send a test notification:"
echo "   curl -d 'Test notification!' https://ntfy.sh/$NTFY_TOPIC"
echo ""
