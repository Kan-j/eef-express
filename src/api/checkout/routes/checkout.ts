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
  ],
};
