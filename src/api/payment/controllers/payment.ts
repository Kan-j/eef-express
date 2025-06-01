/**
 * payment controller
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::payment.payment', ({ strapi }) => ({
  /**
   * Get payment details
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;

      if (!id) {
        return ctx.badRequest('Payment ID is required');
      }

      // If user is admin, get any payment. Otherwise, only get user's own payments
      const isAdmin = user && user.role && user.role.type === 'admin';
      const userId = !isAdmin ? user.id : undefined;

      const payment = await strapi.service('api::payment.payment').getPaymentDetails(parseInt(id), userId);

      return this.transformResponse(payment);
    } catch (error) {
      if (error.message === 'Payment not found') {
        return ctx.notFound('Payment not found');
      }
      ctx.throw(500, error);
    }
  },

  /**
   * Get user's payment history
   */
  async myPayments(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const data = await strapi.service('api::payment.payment').getUserPayments(user.id, query);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Update payment status (admin only)
   */
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status } = ctx.request.body;

      // Check if user is admin
      const { user } = ctx.state;
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can update payment status');
      }

      if (!id) {
        return ctx.badRequest('Payment ID is required');
      }

      if (!status) {
        return ctx.badRequest('Status is required');
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        return ctx.badRequest(`Status must be one of: ${validStatuses.join(', ')}`);
      }

      // Update the payment status
      const payment = await strapi.service('api::payment.payment').updatePaymentStatus(
        parseInt(id),
        status
      );

      return this.transformResponse(payment);
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));
