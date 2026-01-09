---
name: webhook-notify
description: Set up webhook-to-desktop notification systems using Cloudflare Workers and ntfy.sh. Use when users want to receive desktop notifications for webhooks from services like Stripe payments, GitHub events, custom app alerts, error monitoring, or any webhook source. Handles the full setup including worker deployment, local listener, and background service installation. Supports custom sounds, click actions, rich content, and event filtering.
---

# Webhook Desktop Notifications

Set up secure, reliable webhook-to-desktop notification systems that receive webhooks from any source and display native desktop notifications on macOS.

## Architecture

The system uses a proven pattern:

1. **Cloudflare Worker** - Receives webhooks from external services (Stripe, GitHub, custom apps)
2. **ntfy.sh** - Message relay service (no account required)
3. **Local Listener** - Background process that subscribes to ntfy.sh and displays desktop notifications
4. **macOS Service** - Keeps listener running automatically

**Benefits:**
- No local port exposure or tunneling required
- Secure and reliable message delivery
- Free tier sufficient for most use cases
- Handles network interruptions with automatic reconnection

## Quick Start

Run the init script to set up a new webhook notification system:

```bash
scripts/init_webhook.sh <webhook-name> <ntfy-topic> [output-dir] [sound-file]
```

**Example:**
```bash
scripts/init_webhook.sh stripe-payments myapp-stripe
```

This creates:
- Cloudflare Worker for receiving webhooks
- Local listener script for desktop notifications
- macOS launchd service configuration
- All necessary configuration files

## Workflow

### Step 1: Initialize Webhook System

Run `init_webhook.sh` with appropriate parameters:

**Arguments:**
- `webhook-name`: Identifier for this webhook (e.g., "stripe-payments", "github-prs")
- `ntfy-topic`: Your unique ntfy.sh topic name (e.g., "myapp-notifications-2024")
- `output-dir`: (Optional) Where to create files (default: `~/.claude/webhooks/<webhook-name>`)
- `sound-file`: (Optional) Custom notification sound (default: system sound)

**Example with custom sound:**
```bash
scripts/init_webhook.sh github-alerts my-github-topic ~/webhooks /path/to/alert.mp3
```

### Step 2: Customize Worker Logic

Edit the generated `worker.js` to handle your specific webhook format.

The worker template includes examples for:
- Generic webhooks (title/message/url format)
- Stripe payment events
- GitHub events (PRs, issues, releases)

**Modify the `extractNotification()` function** to parse your webhook structure and return notification details.

**Example for custom app webhooks:**
```javascript
function extractNotification(event) {
  // Your custom webhook format
  if (event.type === 'user.signup') {
    return {
      title: 'New User Signup',
      message: `${event.user_email} just created an account`,
      priority: '4',
      tags: 'user,tada',
      url: `https://myapp.com/admin/users/${event.user_id}`,
    };
  }

  return null; // Ignore other events
}
```

**Notification object fields:**
- `title`: Notification title (required)
- `message`: Notification body text (required)
- `priority`: 1-5, where 5 is highest (optional, default: 3)
- `tags`: Emoji tags for ntfy.sh like "moneybag", "warning", "fire" (optional)
- `url`: URL to open when notification is clicked (optional)

**For common patterns**, see [EXAMPLES.md](references/EXAMPLES.md) with complete examples for:
- Stripe payments and refunds
- GitHub PR/issue notifications
- Error monitoring and alerts
- Custom business events
- Event filtering and routing

### Step 3: Deploy Cloudflare Worker

Navigate to the webhook directory and deploy:

```bash
cd ~/.claude/webhooks/<webhook-name>/webhook
npx wrangler deploy
```

The deployment will output your worker URL:
```
https://<webhook-name>.<your-subdomain>.workers.dev
```

**Configure your webhook source** to send POST requests to:
```
https://<webhook-name>.<your-subdomain>.workers.dev/webhook
```

**Optional: Add webhook secret** for signature verification:
```bash
npx wrangler secret put WEBHOOK_SECRET
```

### Step 4: Install Local Listener

Install the listener as a background service that starts automatically:

```bash
scripts/install_service.sh ~/.claude/webhooks/<webhook-name>/com.webhook.<webhook-name>.plist
```

The service will:
- Start immediately
- Restart automatically if it crashes
- Run on system startup

**Test manually before installing:**
```bash
~/.claude/webhooks/<webhook-name>/listener.sh
```

Then send a test notification:
```bash
curl -d 'Test notification!' https://ntfy.sh/<your-topic>
```

### Step 5: Test End-to-End

Send a test webhook to verify the complete flow:

```bash
curl -X POST https://<webhook-name>.<your-subdomain>.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello from webhook!"}'
```

You should see:
1. Worker logs in Cloudflare dashboard
2. Message in listener logs: `~/.claude/webhooks/<webhook-name>/logs/listener.log`
3. Desktop notification with sound

## Troubleshooting

**No notification received:**
1. Check worker logs: `cd webhook && npx wrangler tail`
2. Check listener logs: `tail -f ~/.claude/webhooks/<webhook-name>/logs/*.log`
3. Verify service is running: `launchctl list | grep webhook`
4. Test ntfy.sh directly: `curl -d "Test" https://ntfy.sh/<your-topic>`

**Notification sound not playing:**
- Verify sound file exists and is valid audio format
- Check macOS notification permissions for `terminal-notifier`
- Try with default system sound first

**Service keeps stopping:**
- Check stderr log: `cat ~/.claude/webhooks/<webhook-name>/logs/stderr.log`
- Ensure `terminal-notifier` is installed: `brew install terminal-notifier`
- Verify listener script has execute permissions

**Too many notifications (keepalive messages):**
- The listener template already filters empty keepalive messages
- If still seeing duplicates, check worker `extractNotification()` logic

## Common Patterns

### Multiple Webhooks

Create separate notification systems for different sources:

```bash
scripts/init_webhook.sh stripe-payments myapp-stripe
scripts/init_webhook.sh github-alerts myapp-github
scripts/init_webhook.sh error-monitoring myapp-errors
```

Each runs independently with its own worker, listener, and service.

### Event Filtering

Return `null` from `extractNotification()` to ignore events:

```javascript
function extractNotification(event) {
  // Ignore test events
  if (event.test || event.environment !== 'production') {
    return null;
  }

  // Ignore low-priority actions
  if (event.action === 'labeled') {
    return null;
  }

  // Handle other events...
}
```

### Priority-Based Sounds

Modify `listener.sh` to play different sounds by priority:

```bash
priority=$(echo "$message" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('priority','3'))" 2>/dev/null || echo "3")

if [[ "$priority" == "5" ]]; then
    afplay "/System/Library/Sounds/Sosumi.aiff" &  # Critical
elif [[ "$priority" == "4" ]]; then
    afplay "$CUSTOM_SOUND" &  # High priority
fi
```

### Rich Notifications

ntfy.sh supports image attachments and action buttons:

```javascript
await fetch(NTFY_URL, {
  method: 'POST',
  headers: {
    'Title': notification.title,
    'Attach': 'https://example.com/screenshot.png',
    'Actions': 'view, View details, https://example.com',
  },
  body: notification.message,
});
```

## Managing Services

**Check if service is running:**
```bash
launchctl list | grep com.webhook.<webhook-name>
```

**View live logs:**
```bash
tail -f ~/.claude/webhooks/<webhook-name>/logs/*.log
```

**Restart service:**
```bash
launchctl unload ~/Library/LaunchAgents/com.webhook.<webhook-name>.plist
launchctl load ~/Library/LaunchAgents/com.webhook.<webhook-name>.plist
```

**Stop service:**
```bash
launchctl unload ~/Library/LaunchAgents/com.webhook.<webhook-name>.plist
```

**Uninstall completely:**
```bash
launchctl unload ~/Library/LaunchAgents/com.webhook.<webhook-name>.plist
rm ~/Library/LaunchAgents/com.webhook.<webhook-name>.plist
rm -rf ~/.claude/webhooks/<webhook-name>
```

## Resources

### scripts/

- `init_webhook.sh` - Initialize new webhook notification system
- `install_service.sh` - Install listener as macOS background service

### assets/

- `worker-template.js` - Cloudflare Worker template
- `listener-template.sh` - Local listener script template
- `launchd-template.plist` - macOS service configuration template

### references/

- `EXAMPLES.md` - Complete examples for common webhook sources (Stripe, GitHub, error monitoring, custom apps) with code samples and patterns
