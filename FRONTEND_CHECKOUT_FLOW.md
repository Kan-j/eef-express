# Complete Frontend Checkout Flow with Stripe Integration

## Overview

This document outlines the complete checkout flow for the EEF Express e-commerce application, including Stripe integration for credit card payments and cash on delivery options.

## Prerequisites

1. **Stripe Setup**: 
   - Create a Stripe account
   - Get your publishable and secret keys
   - Set `STRIPE_SECRET_KEY` in your environment variables
   - Install Stripe SDK in your frontend: `npm install @stripe/stripe-js`

2. **Environment Variables**:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   FRONTEND_URL=http://localhost:3000
   ```

## Complete Checkout Flow

### Step 1: Authentication
```
POST /api/auth/local
```
**Request:**
```json
{
  "identifier": "user@example.com",
  "password": "Password123"
}
```

### Step 2: Cart Management
```
POST /api/cart/products
```
**Request:**
```json
{
  "productId": 1,
  "quantity": 2
}
```

### Step 3: Get Delivery Types
```
GET /api/delivery-types
```
**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "Standard",
      "amount": 10,
      "description": "3-5 business days",
      "estimatedTime": "3-5 days",
      "icon": "truck"
    },
    {
      "id": 2,
      "type": "Express",
      "amount": 20,
      "description": "1-2 business days",
      "estimatedTime": "1-2 days",
      "icon": "shipping-fast"
    }
  ]
}
```

### Step 4: Shipping Address Management

#### Get User Addresses
```
GET /api/shipping-addresses/me
```

#### Add New Address
```
POST /api/shipping-addresses
```
**Request:**
```json
{
  "name": "John Doe",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apartment 4B",
  "apartmentOrVilla": "Apartment",
  "emirate": "Dubai"
}
```

#### Update Address
```
PUT /api/shipping-addresses/{id}
```

#### Delete Address
```
DELETE /api/shipping-addresses/{id}
```

### Step 5: Get Order Summary with Cart Details
```
GET /api/checkout/summary?deliveryType=Express
```
**Response:**
```json
{
  "data": {
    "subtotal": 59.98,
    "deliveryFee": 20,
    "tax": 3.00,
    "taxRate": 5,
    "total": 82.98,
    "itemCount": 1,
    "totalItems": 2,
    "selectedDeliveryType": "Express",
    "deliveryOptions": [...],
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "title": "Product Name",
          "price": 29.99,
          "images": [...],
          "slug": "product-name"
        },
        "quantity": 2,
        "subtotal": 59.98
      }
    ]
  }
}
```

### Step 6: Get Payment Methods
```
GET /api/checkout/payment-methods
```
**Response:**
```json
{
  "data": [
    {
      "id": "credit_card",
      "name": "Credit Card",
      "description": "Pay with Visa, Mastercard, or American Express",
      "icon": "credit-card",
      "requiresDetails": true,
      "enabled": true
    },
    {
      "id": "cash_on_delivery",
      "name": "Cash on Delivery",
      "description": "Pay when you receive your order",
      "icon": "money-bill",
      "requiresDetails": false,
      "enabled": true
    }
  ]
}
```

### Step 7: Payment Processing

#### Option A: Credit Card Payment (Stripe)

1. **Create Payment Intent**:
```
POST /api/checkout/create-payment-intent
```
**Request:**
```json
{
  "amount": 82.98
}
```
**Response:**
```json
{
  "data": {
    "success": true,
    "clientSecret": "pi_1234567890_secret_...",
    "paymentIntentId": "pi_1234567890"
  }
}
```

2. **Frontend Stripe Integration**:
```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_...');

// Confirm payment on frontend
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: 'John Doe',
    },
  }
});

if (error) {
  // Handle error
} else if (paymentIntent.status === 'succeeded') {
  // Payment successful, proceed to checkout
}
```

3. **Process Checkout with Stripe**:
```
POST /api/checkout
```
**Request:**
```json
{
  "deliveryType": "Express",
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "paymentMethodId": "pm_card_visa"
  },
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "apartmentOrVilla": "Apartment",
    "emirate": "Dubai"
  }
}
```

#### Option B: Cash on Delivery

```
POST /api/checkout
```
**Request:**
```json
{
  "deliveryType": "Standard",
  "paymentMethod": "cash_on_delivery",
  "paymentDetails": {},
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "apartmentOrVilla": "Apartment",
    "emirate": "Dubai"
  }
}
```

#### Option C: Scheduled Delivery

```
POST /api/checkout
```
**Request:**
```json
{
  "deliveryType": "Scheduled",
  "paymentMethod": "cash_on_delivery",
  "paymentDetails": {},
  "shippingAddress": {
    "name": "John Doe",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "apartmentOrVilla": "Apartment",
    "emirate": "Dubai"
  },
  "scheduledDateTime": "2024-01-15T14:30:00.000Z"
}
```

### Step 8: Checkout Response
**Success Response:**
```json
{
  "data": {
    "success": true,
    "order": {
      "id": 1,
      "attributes": {
        "deliveryType": "Express",
        "deliveryFee": 20,
        "subTotal": 59.98,
        "totalAmount": 82.98,
        "paymentMethod": "credit_card",
        "paymentStatus": "completed",
        "products": [...],
        "shippingAddress": {...},
        "orderStatus": [...]
      }
    },
    "payment": {
      "success": true,
      "status": "completed",
      "transactionId": "pi_1234567890",
      "message": "Payment processed successfully"
    }
  }
}
```

## Frontend Implementation Guide

### 1. Multi-Step Checkout Component Structure

```
CheckoutPage/
├── components/
│   ├── CartReview.jsx
│   ├── ShippingAddress.jsx
│   ├── DeliveryOptions.jsx
│   ├── PaymentMethod.jsx
│   ├── OrderSummary.jsx
│   └── OrderConfirmation.jsx
├── hooks/
│   ├── useCheckout.js
│   ├── useStripe.js
│   └── useAddresses.js
└── CheckoutPage.jsx
```

### 2. Checkout State Management

```javascript
const [checkoutState, setCheckoutState] = useState({
  step: 1,
  cart: null,
  deliveryTypes: [],
  selectedDeliveryType: null,
  addresses: [],
  selectedAddress: null,
  paymentMethods: [],
  selectedPaymentMethod: null,
  orderSummary: null,
  loading: false,
  error: null
});
```

### 3. Step-by-Step Implementation

#### Step 1: Cart Review
- Display cart items from `GET /api/cart/me`
- Allow quantity updates
- Show subtotal

#### Step 2: Shipping Address
- Load addresses from `GET /api/shipping-addresses/me`
- Allow selecting existing address or adding new one
- Form validation for required fields

#### Step 3: Delivery Options
- Load delivery types from `GET /api/delivery-types`
- Update order summary when delivery type changes
- Show scheduled delivery date picker if "Scheduled" is selected

#### Step 4: Payment Method
- Load payment methods from `GET /api/checkout/payment-methods`
- Show Stripe card element for credit card
- Handle different payment method forms

#### Step 5: Order Review
- Display final order summary from `GET /api/checkout/summary`
- Show all selected options
- Terms and conditions checkbox

#### Step 6: Payment Processing
- For Stripe: Create payment intent and confirm payment
- For COD: Skip payment processing
- Submit checkout request

#### Step 7: Order Confirmation
- Display order details
- Show order number and tracking information
- Redirect to order history

### 4. Error Handling

```javascript
const handleCheckoutError = (error) => {
  if (error.response?.status === 400) {
    // Validation errors
    setErrors(error.response.data.errors);
  } else if (error.response?.status === 401) {
    // Authentication required
    redirectToLogin();
  } else {
    // General error
    showErrorMessage('An error occurred during checkout');
  }
};
```

### 5. Loading States

- Show loading spinners during API calls
- Disable form submissions while processing
- Show progress indicators for multi-step flow

## Testing with Stripe

### Test Card Numbers
- **Visa**: 4242424242424242
- **Visa (debit)**: 4000056655665556
- **Mastercard**: 5555555555554444
- **American Express**: 378282246310005
- **Declined card**: 4000000000000002

### Test Scenarios
1. Successful credit card payment
2. Failed credit card payment
3. Cash on delivery order
4. Scheduled delivery order
5. Different delivery types
6. Multiple shipping addresses

## Security Considerations

1. **Never store card details** - Use Stripe's secure tokenization
2. **Validate on server** - Always validate payment amounts server-side
3. **Use HTTPS** - Ensure all payment communications are encrypted
4. **Webhook verification** - Verify Stripe webhooks for payment confirmations
5. **Rate limiting** - Implement rate limiting on checkout endpoints

## Monitoring and Analytics

1. Track checkout abandonment rates
2. Monitor payment success/failure rates
3. Log payment processing times
4. Track popular delivery options
5. Monitor cart-to-order conversion rates

This comprehensive checkout flow provides a secure, user-friendly experience with multiple payment options and robust error handling.
