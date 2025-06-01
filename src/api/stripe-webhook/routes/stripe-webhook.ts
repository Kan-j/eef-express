/**
 * stripe-webhook router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/stripe/webhook',
      handler: 'api::stripe-webhook.stripe-webhook.handleWebhook',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        // Disable body parsing for this route
        bodyParser: false,  // Disable automatic body parsing for this specific route
      },
    },
  ],
};
