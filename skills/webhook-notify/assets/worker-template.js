/**
 * Webhook to Desktop Notification Worker
 *
 * Receives webhooks and forwards to ntfy.sh for desktop notifications.
 *
 * Setup:
 * 1. Deploy: npx wrangler deploy
 * 2. Configure webhook URL in your service: https://your-worker.workers.dev/webhook
 * 3. (Optional) Set webhook secret: npx wrangler secret put WEBHOOK_SECRET
 *
 * Environment variables:
 * - WEBHOOK_SECRET (optional): Secret for verifying webhook signatures
 * - NTFY_TOPIC (required): Your ntfy.sh topic name
 */

const NTFY_TOPIC = '{{NTFY_TOPIC}}'; // Will be replaced during init
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    // Only handle POST to /webhook
    if (request.method !== 'POST' || url.pathname !== '/webhook') {
      return new Response('Not found', { status: 404 });
    }

    const body = await request.text();
    let event;

    try {
      event = JSON.parse(body);
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log(`Webhook received: ${JSON.stringify(event).substring(0, 100)}...`);

    // Extract notification details - customize this based on your webhook structure
    const notification = extractNotification(event);

    if (!notification) {
      console.log('No notification generated for this event');
      return new Response('OK (no notification)', { status: 200 });
    }

    // Send to ntfy.sh
    try {
      await fetch(NTFY_URL, {
        method: 'POST',
        headers: {
          'Title': notification.title || 'Webhook Notification',
          'Priority': notification.priority || '3',
          'Tags': notification.tags || 'bell',
          'Click': notification.url || '',
        },
        body: notification.message,
      });
      console.log(`Notified: ${notification.title} - ${notification.message}`);
    } catch (err) {
      console.error('ntfy error:', err);
    }

    return new Response('OK', { status: 200 });
  },
};

/**
 * Extract notification details from webhook event
 * Customize this function for your specific webhook format
 */
function extractNotification(event) {
  // Example 1: Generic webhook with title/message
  if (event.title && event.message) {
    return {
      title: event.title,
      message: event.message,
      priority: event.priority || '3',
      tags: event.tags || 'bell',
      url: event.url || '',
    };
  }

  // Example 2: Stripe-style payment events
  if (event.type === 'payment_intent.succeeded' || event.type === 'charge.succeeded') {
    const amount = event.data?.object?.amount;
    const amountStr = amount ? `$${(amount / 100).toFixed(2)}` : 'Payment';
    return {
      title: 'Payment Received',
      message: amountStr,
      priority: '4',
      tags: 'moneybag',
      url: `https://dashboard.stripe.com/payments/${event.data?.object?.id}`,
    };
  }

  // Example 3: GitHub webhook events
  if (event.repository && event.action) {
    return {
      title: `GitHub: ${event.action}`,
      message: `${event.repository.full_name} - ${event.sender?.login || 'unknown'}`,
      priority: '3',
      tags: 'github',
      url: event.pull_request?.html_url || event.issue?.html_url || event.repository.html_url,
    };
  }

  // Add your custom event types here...

  return null; // No notification for this event type
}
