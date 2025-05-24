/**
 * checkout router
 */

export default {
  routes: [
    // Process checkout
    {
      method: 'POST',
      path: '/checkout',
      handler: 'api::checkout.checkout.checkout',
      config: {
        policies: [],
      },
    },
    // Get order summary
    {
      method: 'GET',
      path: '/checkout/summary',
      handler: 'api::checkout.checkout.orderSummary',
      config: {
        policies: [],
      },
    },
    // Get available payment methods
    {
      method: 'GET',
      path: '/checkout/payment-methods',
      handler: 'api::checkout.checkout.paymentMethods',
      config: {
        policies: [],
      },
    },
    // Create Stripe Payment Intent
    {
      method: 'POST',
      path: '/checkout/create-payment-intent',
      handler: 'api::checkout.checkout.createPaymentIntent',
      config: {
        policies: [],
      },
    },
    // Pay for existing order
    {
      method: 'POST',
      path: '/checkout/pay/:orderId',
      handler: 'api::checkout.checkout.payForOrder',
      config: {
        policies: [],
      },
    },
  ],
};
