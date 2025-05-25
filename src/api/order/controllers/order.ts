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
   * Get user's order history with enhanced filtering
   */
  async myOrders(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      console.log(`📋 Getting order history for user ${user.id}`);
      console.log(`🔍 Query parameters:`, query);

      const data = await strapi.service('api::order.order').getUserOrderHistory(user.id, query);

      console.log(`✅ Found ${data.results.length} orders for user ${user.id}`);

      return this.transformResponse(data);
    } catch (error) {
      console.error('❌ Error getting user orders:', error);
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

  /**
   * Get all orders (Admin only) with advanced filtering
   */
  async findAll(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      // Check if user is admin
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can view all orders');
      }

      console.log(`📋 Admin ${user.id} getting all orders`);
      console.log(`🔍 Query parameters:`, query);

      const data = await strapi.service('api::order.order').getAllOrders(query);

      console.log(`✅ Found ${data.results.length} total orders`);

      return this.transformResponse(data);
    } catch (error) {
      console.error('❌ Error getting all orders:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Cancel an order (User can cancel their own orders, Admin can cancel any)
   */
  async cancelOrder(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;
      const { reason } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      console.log(`🚫 User ${user.id} attempting to cancel order ${id}`);

      const result = await strapi.service('api::order.order').cancelOrder(
        parseInt(id),
        user.id,
        user.role?.type === 'admin',
        reason
      );

      console.log(`✅ Order ${id} cancelled successfully`);

      return this.transformResponse(result);
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      if (error.message === 'Order not found') {
        return ctx.notFound('Order not found');
      }
      if (error.message === 'Cannot cancel this order') {
        return ctx.badRequest('Cannot cancel this order');
      }
      if (error.message === 'Unauthorized') {
        return ctx.forbidden('You can only cancel your own orders');
      }
      ctx.throw(500, error);
    }
  },

  /**
   * Get order statistics (Admin only)
   */
  async getOrderStats(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      // Check if user is admin
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can view order statistics');
      }

      console.log(`📊 Admin ${user.id} getting order statistics`);

      const stats = await strapi.service('api::order.order').getOrderStatistics(query);

      console.log(`✅ Order statistics generated`);

      return ctx.send({
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
          generatedBy: user.id
        }
      });
    } catch (error) {
      console.error('❌ Error getting order statistics:', error);
      ctx.throw(500, error);
    }
  },

  /**
   * Update order delivery status with tracking
   */
  async updateDeliveryStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, locationNote, estimatedDelivery } = ctx.request.body;
      const { user } = ctx.state;

      // Check if user is admin
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can update delivery status');
      }

      if (!id) {
        return ctx.badRequest('Order ID is required');
      }

      if (!status) {
        return ctx.badRequest('Delivery status is required');
      }

      console.log(`🚚 Admin ${user.id} updating delivery status for order ${id}`);

      const result = await strapi.service('api::order.order').updateDeliveryStatus(
        parseInt(id),
        status,
        locationNote,
        estimatedDelivery
      );

      console.log(`✅ Delivery status updated for order ${id}`);

      return this.transformResponse(result);
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      if (error.message === 'Order not found') {
        return ctx.notFound('Order not found');
      }
      ctx.throw(500, error);
    }
  },

  /**
   * Search orders by various criteria (Admin only)
   */
  async searchOrders(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      // Check if user is admin
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can search orders');
      }

      console.log(`🔍 Admin ${user.id} searching orders`);
      console.log(`🔍 Search parameters:`, query);

      const data = await strapi.service('api::order.order').searchOrders(query);

      console.log(`✅ Found ${data.results.length} orders matching search criteria`);

      return this.transformResponse(data);
    } catch (error) {
      console.error('❌ Error searching orders:', error);
      ctx.throw(500, error);
    }
  },
}));
