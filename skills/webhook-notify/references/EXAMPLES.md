# Webhook Notification Examples

Common webhook notification patterns and customizations.

## Table of Contents

1. [Payment Notifications (Stripe)](#payment-notifications-stripe)
2. [GitHub Events](#github-events)
3. [Error Monitoring](#error-monitoring)
4. [Custom App Events](#custom-app-events)
5. [Filtering and Routing](#filtering-and-routing)
6. [Advanced Customizations](#advanced-customizations)

## Payment Notifications (Stripe)

### Setup

```bash
init_webhook.sh stripe-payments satoshi-stripe ~/.claude/webhooks/stripe ~/.claude/skills/webhook-notify/assets/sounds/kaching.mp3
```

### Worker Customization

In `extractNotification()`, handle Stripe events:

```javascript
function extractNotification(event) {
  // Stripe payment events
  if (event.type === 'checkout.session.completed' ||
      event.type === 'charge.succeeded' ||
      event.type === 'payment_intent.succeeded') {

    const amount = event.data?.object?.amount_total || event.data?.object?.amount;
    const amountStr = amount ? `$${(amount / 100).toFixed(2)}` : 'Payment';
    const paymentId = event.data?.object?.payment_intent || event.data?.object?.id;

    return {
      title: 'Ka-ching!',
      message: `${amountStr} received`,
      priority: '4',
      tags: 'moneybag',
      url: `https://dashboard.stripe.com/payments/${paymentId}`,
    };
  }

  // Stripe refund events
  if (event.type === 'charge.refunded') {
    const amount = event.data?.object?.amount_refunded;
    const amountStr = amount ? `$${(amount / 100).toFixed(2)}` : 'Refund';

    return {
      title: 'Refund Processed',
      message: `${amountStr} refunded`,
      priority: '3',
      tags: 'warning',
      url: `https://dashboard.stripe.com/payments/${event.data?.object?.id}`,
    };
  }

  return null;
}
```

## GitHub Events

### Setup

```bash
init_webhook.sh github-notifications my-github-topic
```

### Worker Customization

Handle GitHub webhook events:

```javascript
function extractNotification(event) {
  // GitHub pull request events
  if (event.pull_request) {
    const action = event.action; // opened, closed, merged, etc.
    const pr = event.pull_request;

    return {
      title: `PR ${action}: ${pr.title}`,
      message: `${event.repository.full_name} by ${pr.user.login}`,
      priority: action === 'opened' ? '4' : '3',
      tags: 'github,pr',
      url: pr.html_url,
    };
  }

  // GitHub issue events
  if (event.issue && !event.pull_request) {
    return {
      title: `Issue ${event.action}: ${event.issue.title}`,
      message: `${event.repository.full_name} by ${event.issue.user.login}`,
      priority: '3',
      tags: 'github,issue',
      url: event.issue.html_url,
    };
  }

  // GitHub release events
  if (event.release) {
    return {
      title: `New Release: ${event.release.name || event.release.tag_name}`,
      message: event.repository.full_name,
      priority: '4',
      tags: 'github,rocket',
      url: event.release.html_url,
    };
  }

  return null;
}
```

## Error Monitoring

### Setup

```bash
init_webhook.sh error-alerts my-errors-topic
```

### Worker Customization

Handle error notifications from your app:

```javascript
function extractNotification(event) {
  // Application errors
  if (event.type === 'error' || event.level === 'error') {
    return {
      title: `⚠️ ${event.error || 'Application Error'}`,
      message: event.message || event.stack?.split('\n')[0] || 'Unknown error',
      priority: '5', // High priority for errors
      tags: 'warning,fire',
      url: event.url || event.dashboard_url || '',
    };
  }

  // Warnings
  if (event.level === 'warning') {
    return {
      title: `Warning: ${event.message}`,
      message: event.details || '',
      priority: '3',
      tags: 'warning',
      url: event.url || '',
    };
  }

  return null;
}
```

## Custom App Events

### Setup

```bash
init_webhook.sh app-events my-app-topic
```

### Generic Event Format

Send webhooks in this format from your app:

```json
{
  "title": "User Signed Up",
  "message": "john@example.com just created an account",
  "priority": "3",
  "tags": "user,signup",
  "url": "https://myapp.com/admin/users/123"
}
```

The worker template already handles this format by default.

### Custom Business Events

```javascript
function extractNotification(event) {
  // Order placed
  if (event.type === 'order.placed') {
    return {
      title: 'New Order',
      message: `Order #${event.order_id} - ${event.customer_name}`,
      priority: '4',
      tags: 'shopping_cart',
      url: `https://myapp.com/orders/${event.order_id}`,
    };
  }

  // User milestone
  if (event.type === 'user.milestone') {
    return {
      title: `Milestone: ${event.milestone}`,
      message: `${event.user_name} reached ${event.value}`,
      priority: '3',
      tags: 'trophy',
      url: `https://myapp.com/users/${event.user_id}`,
    };
  }

  return null;
}
```

## Filtering and Routing

### Ignore Certain Events

```javascript
function extractNotification(event) {
  // Ignore test events
  if (event.test === true || event.environment === 'development') {
    return null;
  }

  // Ignore low-priority GitHub events
  if (event.action === 'labeled' || event.action === 'unlabeled') {
    return null;
  }

  // Handle other events...
}
```

### Multiple Ntfy Topics

Create separate webhooks for different priorities:

```bash
# High priority alerts
init_webhook.sh critical-alerts my-critical-topic

# Regular notifications
init_webhook.sh app-notifications my-app-topic

# Low priority info
init_webhook.sh info-logs my-info-topic
```

Configure different webhook URLs in your app for each priority level.

## Advanced Customizations

### Custom Sounds Per Event Type

Modify `listener.sh` to play different sounds:

```bash
# In listener.sh, after parsing the message:
priority=$(echo "$message" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('priority','3'))" 2>/dev/null || echo "3")

if [[ "$priority" == "5" ]]; then
    afplay "/System/Library/Sounds/Sosumi.aiff" &  # Critical
elif [[ "$priority" == "4" ]]; then
    afplay "$PLAY_SOUND" &  # High
else
    # No sound for lower priorities
    :
fi
```

### Rich Notifications with Images

ntfy.sh supports image attachments:

```javascript
// In worker.js
await fetch(NTFY_URL, {
  method: 'POST',
  headers: {
    'Title': notification.title,
    'Attach': 'https://example.com/image.png', // Image URL
    'Filename': 'screenshot.png',
  },
  body: notification.message,
});
```

### Webhook Authentication

Verify webhook signatures:

```javascript
// In worker.js
export default {
  async fetch(request, env) {
    // ... existing code ...

    const signature = request.headers.get('x-webhook-signature');

    if (env.WEBHOOK_SECRET && signature) {
      const isValid = await verifySignature(body, signature, env.WEBHOOK_SECRET);
      if (!isValid) {
        return new Response('Invalid signature', { status: 401 });
      }
    }

    // ... rest of code ...
  }
}

async function verifySignature(payload, signature, secret) {
  // Implement your signature verification
  // Example for HMAC-SHA256:
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = hexToBytes(signature);
  const dataBytes = encoder.encode(payload);

  return await crypto.subtle.verify('HMAC', key, signatureBytes, dataBytes);
}
```

### Scheduled Digests

Instead of instant notifications, batch them:

```javascript
// Store events in Cloudflare KV or Durable Objects
// Send digest every hour/day via scheduled worker
```
