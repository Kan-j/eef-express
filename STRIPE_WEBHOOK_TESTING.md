# Stripe Webhook Testing Guide

## Overview

This guide covers testing the Stripe webhook implementation that handles payment verification and order completion in our system.

## Webhook Endpoint

```
POST /api/stripe/webhook
```

**Important:** This endpoint does NOT require authentication as it's called by Stripe's servers.

## Webhook Events Handled

### 1. `checkout.session.completed`
This is the primary event that handles successful payments and order completion.

## Testing Methods

### Method 1: Stripe CLI (Recommended for Development)

#### Setup Stripe CLI
1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Login to Stripe**: `stripe login`
3. **Forward events to local server**:
   ```bash
   stripe listen --forward-to localhost:1337/api/stripe/webhook
   ```
4. **Copy the webhook secret** from the CLI output and add to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
   ```

#### Test Flow
1. **Start Stripe CLI forwarding**
2. **Create a checkout session** via your API
3. **Complete payment** in Stripe checkout
4. **Watch webhook logs** in both Stripe CLI and Strapi console

### Method 2: Stripe Dashboard Webhooks

#### Setup
1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. **Add endpoint**: `https://your-domain.com/api/stripe/webhook`
3. **Select events**: `checkout.session.completed`
4. **Copy webhook secret** to your `.env`

### Method 3: Manual Testing with Postman

You can simulate webhook events for testing:

#### Request
```
POST http://localhost:1337/api/stripe/webhook
Content-Type: application/json
Stripe-Signature: t=1234567890,v1=signature_here
```

#### Sample Payload (checkout.session.completed)
```json
{
  "id": "evt_test_webhook",
  "object": "event",
  "api_version": "2023-10-16",
  "created": 1234567890,
  "data": {
    "object": {
      "id": "cs_test_1234567890",
      "object": "checkout.session",
      "amount_total": 8298,
      "currency": "aed",
      "customer": "cus_test_1234567890",
      "customer_details": {
        "email": "user@example.com",
        "name": "John Doe"
      },
      "customer_email": "user@example.com",
      "metadata": {
        "order_id": "1",
        "user_id": "1"
      },
      "payment_intent": "pi_test_1234567890",
      "payment_status": "paid",
      "status": "complete"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_test_1234567890",
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}
```

## Expected Webhook Processing Flow

### 1. Webhook Received
```
🔔 ===== STRIPE WEBHOOK RECEIVED =====
📅 Timestamp: 2023-06-15T14:30:00.000Z
🌐 IP Address: 127.0.0.1
🔔 Event Type: checkout.session.completed
🆔 Event ID: evt_test_webhook
```

### 2. Session Processing
```
✅ Processing checkout session completed: cs_test_1234567890
📋 Processing order ID: 1
📦 Order found: {
  id: 1,
  paymentStatus: 'pending',
  totalAmount: 82.98,
  hasPayment: true
}
```

### 3. Payment Update
```
🔄 Updating payment record ID: 1
✅ Payment 1 updated successfully
```

### 4. Order Completion
```
✅ Order 1 marked as completed
🧹 Clearing cart for user 1
✅ Cart cleared for user 1
📧 Order confirmation sent for order 1
🎉 Checkout session processing completed for order 1
```

### 5. Webhook Response
```
🏁 ===== STRIPE WEBHOOK COMPLETED =====
```

## Testing Scenarios

### Scenario 1: Successful Payment
1. **Create order** with card payment
2. **Complete Stripe checkout**
3. **Verify webhook processes correctly**
4. **Check order status** is updated to 'completed'
5. **Check payment status** is updated to 'completed'
6. **Verify cart is cleared**

### Scenario 2: Duplicate Webhook
1. **Process successful payment**
2. **Send same webhook again**
3. **Verify it's skipped** (order already completed)

### Scenario 3: Invalid Order ID
1. **Send webhook** with non-existent order_id
2. **Verify error handling**

### Scenario 4: Missing Metadata
1. **Send webhook** without order_id in metadata
2. **Verify error handling**

## Postman Test Collection

### Test 1: Valid Webhook
```json
{
  "name": "Stripe Webhook - Checkout Session Completed",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      },
      {
        "key": "Stripe-Signature",
        "value": "t={{timestamp}},v1={{signature}}"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"id\": \"evt_test_webhook\",\n  \"object\": \"event\",\n  \"api_version\": \"2023-10-16\",\n  \"created\": {{timestamp}},\n  \"data\": {\n    \"object\": {\n      \"id\": \"cs_test_1234567890\",\n      \"object\": \"checkout.session\",\n      \"amount_total\": 8298,\n      \"currency\": \"aed\",\n      \"customer\": \"cus_test_1234567890\",\n      \"customer_details\": {\n        \"email\": \"user@example.com\",\n        \"name\": \"John Doe\"\n      },\n      \"customer_email\": \"user@example.com\",\n      \"metadata\": {\n        \"order_id\": \"1\",\n        \"user_id\": \"1\"\n      },\n      \"payment_intent\": \"pi_test_1234567890\",\n      \"payment_status\": \"paid\",\n      \"status\": \"complete\"\n    }\n  },\n  \"livemode\": false,\n  \"pending_webhooks\": 1,\n  \"request\": {\n    \"id\": \"req_test_1234567890\",\n    \"idempotency_key\": null\n  },\n  \"type\": \"checkout.session.completed\"\n}"
    },
    "url": {
      "raw": "{{baseUrl}}/api/stripe/webhook",
      "host": ["{{baseUrl}}"],
      "path": ["api", "stripe", "webhook"]
    }
  }
}
```

### Expected Response
```json
{
  "received": true
}
```

## Verification Steps

After webhook processing, verify:

### 1. Order Status Updated
```
GET /api/orders/1
Authorization: Bearer {{jwt}}
```

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "paymentStatus": "completed",
      "totalAmount": 82.98,
      "deliveryType": "Express"
    }
  }
}
```

### 2. Payment Record Updated
```
GET /api/payments/1
Authorization: Bearer {{jwt}}
```

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "status": "completed",
      "transactionId": "cs_test_1234567890",
      "paymentDetails": {
        "stripeSessionId": "cs_test_1234567890",
        "paymentStatus": "paid",
        "completedAt": "2023-06-15T14:30:00.000Z"
      }
    }
  }
}
```

### 3. Cart Cleared
```
GET /api/cart/me
Authorization: Bearer {{jwt}}
```

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "item": []
    }
  }
}
```

## Error Handling

### Invalid Signature
**Response:** `400 Bad Request - "Invalid signature"`

### Missing Order ID
**Logs:** `❌ Missing order_id in session metadata`
**Response:** `200 OK - {"received": true}`

### Order Not Found
**Logs:** `❌ Order not found for ID 999`
**Response:** `200 OK - {"received": true}`

### Already Completed Order
**Logs:** `ℹ️ Order 1 already completed`
**Response:** `200 OK - {"received": true}`

## Security Features

1. **Signature Verification**: All webhooks are verified using Stripe signature
2. **Idempotency**: Duplicate webhooks are handled gracefully
3. **Error Isolation**: Webhook errors don't affect other orders
4. **Comprehensive Logging**: All webhook events are logged for debugging

## Production Considerations

1. **Use HTTPS** for webhook endpoints
2. **Set up proper monitoring** for webhook failures
3. **Implement retry logic** for failed webhook processing
4. **Monitor webhook delivery** in Stripe Dashboard
5. **Set up alerts** for webhook processing errors

## Troubleshooting

### Common Issues

1. **Webhook not received**
   - Check Stripe Dashboard webhook logs
   - Verify endpoint URL is correct
   - Ensure server is accessible from internet

2. **Signature verification fails**
   - Check `STRIPE_WEBHOOK_SECRET` in `.env`
   - Verify webhook secret matches Stripe Dashboard

3. **Order not found**
   - Check `order_id` in session metadata
   - Verify order exists in database

4. **Payment not updated**
   - Check payment record exists
   - Verify payment service is working

This webhook implementation ensures reliable payment verification and order completion in your e-commerce system!
