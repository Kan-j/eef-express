# Webhook Environment Setup Guide

## Environment Variables

Add these variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Webhook Configuration
WEBHOOK_TOLERANCE_SECONDS=300
WEBHOOK_MAX_EVENTS_CACHE=1000
```

## Development Setup

### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget -O - https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

### 2. Login to Stripe CLI
```bash
stripe login
```

### 3. Start Local Development
```bash
# Terminal 1: Start Strapi
npm run develop

# Terminal 2: Start ngrok (if needed for external access)
ngrok http 1337

# Terminal 3: Start Stripe webhook forwarding
stripe listen --forward-to http://localhost:1337/api/stripe/webhook

# Copy the webhook secret from the output and add to .env
# Example: whsec_1234567890abcdef...
```

## Production Setup

### 1. Stripe Dashboard Configuration
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (optional)
   - `payment_intent.payment_failed` (optional)
5. Copy the webhook secret

### 2. Environment Variables
```env
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing Webhooks

### 1. Test with Stripe CLI
```bash
# Trigger a test event
stripe trigger checkout.session.completed

# Listen for events
stripe listen --events checkout.session.completed
```

### 2. Test with Postman
Create a POST request to test webhook endpoint:

**URL:** `http://localhost:1337/api/stripe/webhook`

**Headers:**
```
Content-Type: application/json
Stripe-Signature: t=1234567890,v1=test_signature
```

**Body:**
```json
{
  "id": "evt_test_webhook",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1234567890,
  "data": {
    "object": {
      "id": "cs_test_session",
      "object": "checkout.session",
      "amount_total": 2000,
      "currency": "usd",
      "customer": "cus_test_customer",
      "customer_email": "test@example.com",
      "payment_status": "paid",
      "metadata": {
        "order_id": "1",
        "user_id": "1"
      }
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_test_request",
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}
```

## Monitoring and Debugging

### 1. Check Webhook Logs
```bash
# View Strapi logs
npm run develop

# Check for webhook-specific logs
grep "STRIPE WEBHOOK" logs/strapi.log
```

### 2. Stripe Dashboard Monitoring
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. View the "Events" tab for delivery status
4. Check response codes and timing

### 3. Debug Failed Webhooks
```bash
# Resend failed webhook from Stripe CLI
stripe events resend evt_webhook_id --webhook-endpoint we_endpoint_id

# View webhook details
stripe events retrieve evt_webhook_id
```

## Security Checklist

### Development
- [ ] Webhook secret is configured in `.env`
- [ ] Raw body middleware is enabled
- [ ] Signature verification is working
- [ ] HTTPS is used (via ngrok for local development)

### Production
- [ ] Production webhook secret is configured
- [ ] HTTPS endpoint is accessible
- [ ] Webhook endpoint is registered in Stripe Dashboard
- [ ] Event types are properly configured
- [ ] Monitoring is set up

## Common Issues and Solutions

### Issue: Signature Verification Fails
**Solution:**
1. Check webhook secret in `.env`
2. Verify raw body middleware is working
3. Ensure no body parsing before signature verification
4. Check Stripe CLI output for correct secret

### Issue: Webhook Not Receiving Events
**Solution:**
1. Verify endpoint URL is correct
2. Check if endpoint is publicly accessible
3. Verify event types are selected in Stripe Dashboard
4. Check firewall/security group settings

### Issue: Duplicate Event Processing
**Solution:**
1. Check event ID tracking implementation
2. Verify order status checking
3. Monitor processed events cache

### Issue: Slow Webhook Response
**Solution:**
1. Check for blocking operations
2. Verify background task processing
3. Monitor database query performance
4. Ensure quick 200 response

## Performance Optimization

### 1. Database Queries
- Use specific field selection
- Implement proper indexing
- Monitor query performance

### 2. Memory Management
- Event cache cleanup (max 1000 events)
- Proper error handling
- Resource cleanup

### 3. Response Time
- Return 200 immediately after processing
- Use background tasks for non-critical operations
- Implement timeout handling

## Backup and Recovery

### 1. Event Replay
```bash
# Replay events from specific time
stripe events list --created-after 1234567890

# Resend specific event
stripe events resend evt_webhook_id
```

### 2. Manual Processing
If webhooks fail, you can manually process orders:
1. Check order status in database
2. Verify payment in Stripe Dashboard
3. Manually update order status if needed
4. Send confirmation emails if required
