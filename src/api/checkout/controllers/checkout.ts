/**
 * checkout controller
 */

// No need to import factories since this is not a core controller

// This is a process controller, not tied to a content type
export default {
  /**
   * Process checkout
   */
  async checkout(ctx: any) {
    try {
      const { user } = ctx.state;
      const checkoutData = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // Process checkout
      const result = await strapi.service('api::checkout.checkout').processCheckout(user.id, checkoutData);

      if (!result.success) {
        return ctx.badRequest(result.error);
      }

      return { data: result };
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Validate coupon code
   */
  async validateCoupon(ctx: any) {
    try {
      const { code } = ctx.params;

      if (!code) {
        return ctx.badRequest('Coupon code is required');
      }

      const result = await strapi.service('api::checkout.checkout').validateCoupon(code);

      return { data: result };
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get order summary
   */
  async orderSummary(ctx: any) {
    try {
      const { user } = ctx.state;
      const { couponCode } = ctx.query as { couponCode?: string };

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const summary = await strapi.service('api::checkout.checkout').calculateOrderSummary(user.id, couponCode);

      return { data: summary };
    } catch (error) {
      ctx.throw(500, error);
    }
  },
};
