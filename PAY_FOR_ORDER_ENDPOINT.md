# Pay for Existing Order Endpoint

## Overview

This endpoint allows users to create a payment session for an existing order. This is useful when:

- User accidentally cancels their payment
- Payment fails and needs to be retried
- User wants to complete payment later
- User reaches the cancel URL and wants to retry payment

## Endpoint Details

### Request
```
POST /api/checkout/pay/{orderId}
```

### Headers
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Path Parameters
- `orderId` (required): The ID of the order to pay for

### Request Body
```json
{
  "customerEmail": "user@example.com"  // Optional: Email for Stripe checkout
}
```

### Response (Success)
```json
{
  "data": {
    "success": true,
    "order": {
      "id": 1,
      "totalAmount": 82.98,
      "deliveryType": "Express",
      "paymentStatus": "pending"
    },
    "payment": {
      "success": true,
      "status": "pending",
      "transactionId": "cs_test_1234567890",
      "amount": 82.98,
      "paymentMethod": "card",
      "message": "Stripe checkout session created successfully",
      "stripeSessionId": "cs_test_1234567890",
      "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_1234567890",
      "paymentId": 1
    },
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_1234567890",
    "message": "Payment session created successfully. Please complete payment to confirm your order."
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "data": null,
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "You must be logged in to make payments"
  }
}
```

#### 403 Forbidden
```json
{
  "data": null,
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "You are not authorized to pay for this order"
  }
}
```

#### 404 Not Found
```json
{
  "data": null,
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Order not found"
  }
}
```

#### 400 Bad Request
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "This order has already been paid"
  }
}
```

## Use Cases

### 1. User Cancels Payment Accidentally
```javascript
// User clicks "Pay Now" button on order details page
const response = await fetch('/api/checkout/pay/123', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerEmail: user.email
  })
});

const result = await response.json();

if (result.data.success) {
  // Redirect to Stripe checkout
  window.location.href = result.data.checkoutUrl;
}
```

### 2. Payment Retry from Order History
```javascript
// In order history, show "Pay Now" button for pending orders
const retryPayment = async (orderId) => {
  try {
    const response = await fetch(`/api/checkout/pay/${orderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerEmail: user.email
      })
    });

    const result = await response.json();
    
    if (result.data.success) {
      window.location.href = result.data.checkoutUrl;
    }
  } catch (error) {
    console.error('Payment retry failed:', error);
  }
};
```

### 3. Cancel Page Recovery
```javascript
// On the cancel page, show option to retry payment
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('order_id');

if (orderId) {
  // Show "Try Again" button
  const retryButton = document.getElementById('retry-payment');
  retryButton.onclick = () => retryPayment(orderId);
}
```

## Frontend Integration Examples

### React Component
```jsx
import React, { useState } from 'react';

const PaymentRetry = ({ orderId, userEmail }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRetryPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/checkout/pay/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail: userEmail
        })
      });

      const result = await response.json();

      if (result.data.success) {
        window.location.href = result.data.checkoutUrl;
      } else {
        setError('Failed to create payment session');
      }
    } catch (err) {
      setError('An error occurred while processing payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-retry">
      <h3>Complete Your Payment</h3>
      <p>Order #{orderId} is waiting for payment</p>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <button 
        onClick={handleRetryPayment}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
};

export default PaymentRetry;
```

### Vue Component
```vue
<template>
  <div class="payment-retry">
    <h3>Complete Your Payment</h3>
    <p>Order #{{ orderId }} is waiting for payment</p>
    
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <button 
      @click="retryPayment"
      :disabled="loading"
      class="btn btn-primary"
    >
      {{ loading ? 'Processing...' : 'Pay Now' }}
    </button>
  </div>
</template>

<script>
export default {
  props: ['orderId', 'userEmail'],
  data() {
    return {
      loading: false,
      error: null
    };
  },
  methods: {
    async retryPayment() {
      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(`/api/checkout/pay/${this.orderId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerEmail: this.userEmail
          })
        });

        const result = await response.json();

        if (result.data.success) {
          window.location.href = result.data.checkoutUrl;
        } else {
          this.error = 'Failed to create payment session';
        }
      } catch (err) {
        this.error = 'An error occurred while processing payment';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

## Security Features

1. **User Authorization**: Only the order owner can create payment sessions
2. **Order Validation**: Only pending or failed orders can be paid
3. **Payment Status Check**: Prevents duplicate payments for completed orders
4. **JWT Authentication**: Requires valid authentication token

## Logging

The endpoint provides comprehensive logging:

```
💳 ===== PAY FOR ORDER REQUEST RECEIVED =====
📅 Timestamp: 2023-06-15T14:30:00.000Z
🌐 IP Address: 127.0.0.1
👤 User Authentication Check:
✅ User authenticated: ID 1, Email: user@example.com
📋 Request validation:
   Order ID from params: 1
   Customer Email: user@example.com
✅ All validation checks passed
🔄 Calling payment service for order 1...

💳 ===== CREATING PAYMENT FOR EXISTING ORDER =====
👤 User ID: 1
📋 Order ID: 1
✅ Order validation passed:
   Order ID: 1
   Payment Status: pending
   Total Amount: $82.98
   Delivery Type: Express
   Products: 2 items
📦 Converted 2 order items to cart format
✅ Stripe checkout session created successfully
   Session ID: cs_test_1234567890
   Checkout URL: https://checkout.stripe.com/pay/cs_test_1234567890
🔄 Updating existing payment record
✅ Payment record updated/created. Payment ID: 1
🎉 PAYMENT SESSION READY - User can complete payment at: https://checkout.stripe.com/pay/cs_test_1234567890
🏁 ===== PAYMENT FOR ORDER CREATION COMPLETED =====
```

## Testing

### Postman Test
```json
{
  "name": "Pay for Existing Order",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{jwt}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n    \"customerEmail\": \"user@example.com\"\n}"
    },
    "url": {
      "raw": "{{baseUrl}}/api/checkout/pay/1",
      "host": ["{{baseUrl}}"],
      "path": ["api", "checkout", "pay", "1"]
    }
  }
}
```

This endpoint provides a robust solution for handling payment retries and ensures users can always complete their orders even if they encounter issues during the initial checkout process.
