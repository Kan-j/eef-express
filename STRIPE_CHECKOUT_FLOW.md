# Complete Stripe Checkout Flow Implementation

## Overview

This document outlines the complete checkout flow with Stripe integration, including order creation, payment processing, and webhook handling.

## Environment Variables

Add these variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
SUCCESS_URL=http://localhost:3000/checkout/success
CANCEL_URL=http://localhost:3000/checkout/cancel
```

## Checkout Flow

### 1. Cash on Delivery Flow

For cash on delivery orders:

1. **Order Creation**: Order is created immediately
2. **Payment Status**: Set to `pending`
3. **Cart Clearing**: Cart is cleared immediately
4. **Order Status**: Order is ready for processing

**API Call:**
```json
POST /api/checkout
{
  "deliveryType": "Standard",
  "paymentMethod": "cash_on_delivery",
  "paymentDetails": {},
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "emirate": "Dubai"
  }
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "order": { ... },
    "payment": {
      "success": true,
      "status": "pending",
      "paymentMethod": "cash_on_delivery"
    },
    "requiresPayment": false
  }
}
```

### 2. Card Payment Flow

For card payments using Stripe:

1. **Order Creation**: Order is created with `pending` payment status
2. **Stripe Checkout Session**: Created with line items for products, delivery, and tax
3. **Payment Processing**: User redirected to Stripe checkout
4. **Webhook Handling**: Payment completion updates order and clears cart

**API Call:**
```json
POST /api/checkout
{
  "deliveryType": "Express",
  "paymentMethod": "card",
  "paymentDetails": {},
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "emirate": "Dubai"
  },
  "customerEmail": "user@example.com"
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "order": { ... },
    "payment": {
      "success": true,
      "status": "pending",
      "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
      "stripeSessionId": "cs_test_..."
    },
    "requiresPayment": true,
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..."
  }
}
```

## Stripe Webhook Setup

### 1. Webhook Endpoint

The webhook endpoint is available at:
```
POST /api/stripe/webhook
```

### 2. Required Webhook Events

Configure these events in your Stripe dashboard:

- `checkout.session.completed` - When payment is successful
- `payment_intent.succeeded` - Additional confirmation
- `payment_intent.payment_failed` - When payment fails

### 3. Webhook Processing

When a payment is completed:

1. **Payment Record Updated**: Status changed to `completed`
2. **Order Status Updated**: Payment status updated to `completed`
3. **Cart Cleared**: User's cart is emptied
4. **Notification Sent**: Order confirmation notification created

## Frontend Integration

### 1. Checkout Process

```javascript
// 1. Process checkout
const checkoutResponse = await fetch('/api/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    deliveryType: 'Express',
    paymentMethod: 'card',
    paymentDetails: {},
    shippingAddress: selectedAddress,
    customerEmail: user.email
  })
});

const checkoutData = await checkoutResponse.json();

// 2. Handle response
if (checkoutData.data.requiresPayment) {
  // Redirect to Stripe checkout
  window.location.href = checkoutData.data.checkoutUrl;
} else {
  // Cash on delivery - redirect to success page
  window.location.href = `/checkout/success?order_id=${checkoutData.data.order.id}`;
}
```

### 2. Success Page

```javascript
// Handle success page
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');
const orderId = urlParams.get('order_id');

if (sessionId) {
  // Payment was processed via Stripe
  // Webhook will have updated the order status
  // Display success message and order details
} else if (orderId) {
  // Cash on delivery order
  // Display success message and order details
}
```

## Testing

### 1. Test Card Numbers

Use these test card numbers in Stripe checkout:

- **Successful payment**: 4242424242424242
- **Declined payment**: 4000000000000002
- **Requires authentication**: 4000002500003155

### 2. Testing Flow

1. **Add items to cart**
2. **Get order summary** with delivery and tax calculation
3. **Process checkout** with card payment method
4. **Complete payment** in Stripe checkout
5. **Verify webhook** processes payment completion
6. **Check order status** is updated to completed
7. **Verify cart** is cleared

### 3. Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:1337/api/stripe/webhook
```

## Order Status Flow

### Cash on Delivery
```
Cart → Order Created (pending) → Cart Cleared → Order Processing
```

### Card Payment
```
Cart → Order Created (pending) → Stripe Checkout → Payment Success → 
Webhook → Order Updated (completed) → Cart Cleared → Order Processing
```

## Error Handling

### 1. Payment Failures

- **Card declined**: User redirected to cancel URL
- **Webhook failure**: Manual order review required
- **Network issues**: Retry mechanism in place

### 2. Order Issues

- **Cart validation**: Ensures products are available
- **Delivery validation**: Validates delivery type and address
- **Tax calculation**: Handles tax calculation errors gracefully

## Security Considerations

1. **Webhook Verification**: All webhooks are verified using Stripe signature
2. **Payment Validation**: Orders are only completed after successful payment
3. **User Authentication**: All checkout endpoints require authentication
4. **Data Validation**: All input data is validated before processing

## Monitoring

### 1. Logs

Key events are logged:
- Order creation
- Payment processing
- Webhook events
- Cart clearing
- Error conditions

### 2. Notifications

- Order confirmations sent to users
- Failed payment notifications
- Webhook processing status

This implementation provides a robust, secure checkout flow with proper error handling and monitoring capabilities.
