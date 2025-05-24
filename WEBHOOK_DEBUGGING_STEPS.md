# Webhook Debugging Steps

## Current Implementation Status

We've implemented a comprehensive solution for Stripe webhook signature verification:

1. ✅ **Middleware Configuration**: Added `includeUnparsed: true`
2. ✅ **Route Configuration**: Disabled body parsing for webhook route
3. ✅ **Controller Enhancement**: Manual raw body reading with detailed logging

## Testing Commands

### 1. Start Strapi Server
```bash
npm run build && npm run develop
```

### 2. Start ngrok
```bash
ngrok http 1337
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 3. Start Stripe CLI
```bash
stripe listen --forward-to https://abc123.ngrok.io/api/stripe/webhook
```
Copy the webhook secret (starts with `whsec_`)

### 4. Update .env file
```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 5. Test webhook
```bash
stripe trigger checkout.session.completed
```

## Expected Success Output

```
🔔 ===== STRIPE WEBHOOK RECEIVED =====
📅 Timestamp: 2025-05-24T19:35:00.000Z
🌐 IP Address: 127.0.0.1
📜 Reading raw body from request stream...
🔐 Signature verification details:
   Signature header: Present
   Raw body type: object
   Raw body length: 1234
   Raw body is Buffer: true
   Webhook secret configured: Yes
✅ Webhook signature verified successfully
🔔 Event Type: checkout.session.completed
🆔 Event ID: evt_test_webhook
✅ Processing checkout session completed: cs_test_1234567890
📋 Processing order ID: 1
📦 Order found: { id: 1, paymentStatus: 'pending', totalAmount: 82.98, hasPayment: true }
🔄 Updating payment record ID: 1
✅ Payment 1 updated successfully
✅ Order 1 marked as completed
🧹 Clearing cart for user 1
✅ Cart cleared for user 1
📧 Order confirmation sent for order 1
🎉 Checkout session processing completed for order 1
🏁 ===== STRIPE WEBHOOK COMPLETED =====
```

## Troubleshooting

### Issue 1: Still getting "parsed JavaScript object" error
**Solution**: Ensure you've restarted Strapi after middleware changes
```bash
npm run build && npm run develop
```

### Issue 2: Raw body is undefined
**Solution**: Check that the route configuration has `parse: false`

### Issue 3: Signature verification fails
**Solution**: Verify webhook secret in `.env` matches Stripe CLI output

### Issue 4: Order not found
**Solution**: Ensure you have a pending order with the correct metadata

## Manual Testing with Postman

If Stripe CLI doesn't work, you can test manually:

### 1. Create a test webhook payload
```json
{
  "id": "evt_test_webhook",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_1234567890",
      "metadata": {
        "order_id": "1",
        "user_id": "1"
      },
      "amount_total": 8298,
      "currency": "aed",
      "payment_status": "paid"
    }
  }
}
```

### 2. Generate signature (skip for testing)
For testing purposes, you can temporarily comment out signature verification in the controller.

### 3. Send POST request
```
POST https://your-ngrok-url.ngrok.io/api/stripe/webhook
Content-Type: application/json
Stripe-Signature: t=1234567890,v1=test_signature

[JSON payload above]
```

## Production Setup

### 1. Configure webhook in Stripe Dashboard
- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `checkout.session.completed`

### 2. Update environment variables
```env
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
```

### 3. Test with real payments
Create a real checkout session and complete payment to test the full flow.

## Success Indicators

✅ **Signature Verification**: No "parsed JavaScript object" errors
✅ **Event Processing**: Webhook events are processed successfully
✅ **Order Updates**: Order payment status changes to "completed"
✅ **Payment Updates**: Payment records are updated with Stripe data
✅ **Cart Clearing**: User's cart is emptied after successful payment
✅ **Notifications**: Order confirmation is sent (if implemented)

The webhook implementation is now robust and should handle Stripe events correctly!
