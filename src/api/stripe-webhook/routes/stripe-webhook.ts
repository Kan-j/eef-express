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
        policies: [],
        middlewares: [],
        auth: false, // Disable authentication for webhook
        // Disable body parsing to preserve raw body for signature verification
        parse: {
          json: false,
          form: false,
          text: false,
          multipart: false,
        },
      },
    },
  ],
};
