/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  /**
   * Create a new order from cart
   */
  async createOrder(ctx) {
    try {
      const { user } = ctx.state;
      const orderData = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // Validate required fields
      if (!orderData.deliveryType) {
        return ctx.badRequest('Delivery type is required');
      }

      if (!orderData.paymentMethod) {
        return ctx.badRequest('Payment method is required');
      }

      if (!orderData.shippingAddress) {
        return ctx.badRequest('Shipping address is required');
      }

      // Create the order
      const order = await strapi.service('api::order.order').createOrderFromCart(user.id, orderData);

      // Create a notification for the user
      await strapi.entityService.create('api::notification.notification', {
        data: {
          users_permissions_user: user.id,
          title: 'Order Placed',
          message: `Your order #${order.id} has been placed successfully.`,
          read: false,
          publishedAt: new Date(),
        },
      });

      return this.transformResponse(order);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Update order status (admin only)
   */
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, locationNote } = ctx.request.body;

      // Check if user is admin (you might need to adjust this based on your roles)
      const { user } = ctx.state;
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can update order status');
      }

      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      if (!status) {
        return ctx.badRequest('Status is required');
      }

      // Update the order status
      const order = await strapi.service('api::order.order').updateOrderStatus(
        parseInt(id),
        status,
        locationNote
      );

      // Create a notification for the user
      await strapi.entityService.create('api::notification.notification', {
        data: {
          users_permissions_user: order.users_permissions_user.id,
          title: 'Order Status Updated',
          message: `Your order #${order.id} status has been updated to ${status}.`,
          read: false,
          publishedAt: new Date(),
        },
      });

      return this.transformResponse(order);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Update payment status (admin only)
   */
  async updatePaymentStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status } = ctx.request.body;

      // Check if user is admin
      const { user } = ctx.state;
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can update payment status');
      }

      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      if (!status) {
        return ctx.badRequest('Payment status is required');
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        return ctx.badRequest(`Status must be one of: ${validStatuses.join(', ')}`);
      }

      // Get the order
      const order = await strapi.entityService.findOne('api::order.order', parseInt(id), {
        populate: ['payment'],
      }) as any; // Use type assertion to avoid TypeScript errors

      if (!order) {
        return ctx.notFound('Order not found');
      }

      // Update the order's payment status
      const updatedOrder = await strapi.entityService.update('api::order.order', parseInt(id), {
        data: {
          paymentStatus: status,
        },
        populate: ['users_permissions_user'],
      }) as any; // Use type assertion to avoid TypeScript errors

      // If there's an associated payment record, update it too
      if (order.payment) {
        await strapi.service('api::payment.payment').updatePaymentStatus(
          order.payment.id,
          status
        );
      }

      // Create a notification for the user
      const statusMessages = {
        pending: 'Your payment is pending.',
        processing: 'Your payment is being processed.',
        completed: 'Your payment has been completed successfully.',
        failed: 'Your payment has failed. Please try again or contact customer support.',
        refunded: 'Your payment has been refunded.',
      };

      // Get user ID from the order
      const userId = updatedOrder.users_permissions_user?.id || order.users_permissions_user?.id;

      if (userId) {
        await strapi.entityService.create('api::notification.notification', {
          data: {
            users_permissions_user: userId,
            title: `Payment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: statusMessages[status] || `Your payment status has been updated to ${status}.`,
            read: false,
            publishedAt: new Date(),
          },
        });
      }

      return this.transformResponse(updatedOrder);
    } catch (error) {
      console.error('Error updating payment status:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Get user's order history
   */
  async myOrders(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const data = await strapi.service('api::order.order').getUserOrderHistory(user.id, query);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get order details
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;

      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      // If user is admin, get any order. Otherwise, only get user's own orders
      const isAdmin = user && user.role && user.role.type === 'admin';
      const userId = !isAdmin ? user.id : undefined;

      const order = await strapi.service('api::order.order').getOrderDetails(parseInt(id), userId);

      return this.transformResponse(order);
    } catch (error) {
      if (error.message === 'Order not found') {
        return ctx.notFound('Order not found');
      }
      ctx.throw(500, error);
    }
  },
}));
