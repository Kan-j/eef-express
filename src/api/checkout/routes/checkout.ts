/**
 * checkout router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/checkout',
      handler: 'api::checkout.checkout.checkout',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/checkout/coupon/:code',
      handler: 'api::checkout.checkout.validateCoupon',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/checkout/summary',
      handler: 'api::checkout.checkout.orderSummary',
      config: {
        policies: [],
      },
    },
  ],
};
