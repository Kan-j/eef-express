/**
 * order service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::order.order', ({ strapi }) => ({
  /**
   * Create a new order from cart
   */
  async createOrderFromCart(userId: number, orderData: any) {
    // Get the user's cart
    const cartService = strapi.service('api::cart.cart');
    const cart = await cartService.getUserCart(userId);

    if (!cart || !cart.item || cart.item.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate cart items before creating order
    const validationResults = await cartService.validateCartForCheckout(userId);

    if (!validationResults.valid) {
      throw new Error(validationResults.message);
    }

    // Calculate totals
    const cartTotals = await cartService.getCartTotals(userId);
    const subtotal = cartTotals.subtotal;

    // Get delivery fee based on delivery type
    let deliveryFee = 0;
    if (orderData.deliveryType) {
      const deliveryPricing = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
        filters: {
          type: orderData.deliveryType,
        },
      });

      if (deliveryPricing && deliveryPricing.length > 0) {
        deliveryFee = Number(deliveryPricing[0].amount);
      }
    }

    // Calculate total amount
    const totalAmount = subtotal + deliveryFee;

    // Create order status log
    const initialStatus = {
      shippingStatus: 'Order Placed',
      timestamp: new Date(),
      locationNote: 'Order received',
    };

    // Create the order with payment status
    const order = await strapi.entityService.create('api::order.order', {
      data: {
        users_permissions_user: userId,
        products: cart.item.map((item: any) => ({
          product: item.product.id,
          quantity: item.quantity,
        })),
        deliveryType: orderData.deliveryType,
        deliveryFee,
        subTotal: subtotal,
        totalAmount,
        scheduledDateTime: orderData.scheduledDateTime,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus || 'pending',
        shippingAddress: orderData.shippingAddress,
        orderStatus: [initialStatus],
        publishedAt: new Date(),
      },
      populate: ['products', 'products.product', 'shippingAddress', 'orderStatus'],
    });

    // Note: Cart clearing is handled in the checkout service after successful payment
    // This ensures the cart is only cleared after the entire checkout process is complete

    return order;
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string, locationNote: string = '') {
    // Get the order
    const order = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: ['orderStatus'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Add new status to the order status log
    const updatedStatusLog = [
      ...((order as any).orderStatus || []),
      {
        shippingStatus: status,
        timestamp: new Date(),
        locationNote,
      },
    ];

    // Update the order
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: {
        orderStatus: updatedStatusLog,
      },
      populate: ['products', 'products.product', 'shippingAddress', 'orderStatus'],
    });

    return updatedOrder;
  },

  /**
   * Get user's order history
   */
  async getUserOrderHistory(userId: number, params: any = {}) {
    const { page = 1, pageSize = 10, sort = 'createdAt:desc' } = params;

    // Get orders for the user
    const { results, pagination } = await strapi.entityService.findPage('api::order.order', {
      filters: {
        users_permissions_user: { id: userId },
      },
      populate: ['products', 'products.product', 'shippingAddress', 'orderStatus'],
      sort,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return { results, pagination };
  },

  /**
   * Get order details
   */
  async getOrderDetails(orderId: number, userId?: number) {
    const filters: any = {
      id: orderId,
    };

    // If userId is provided, ensure the order belongs to the user
    if (userId) {
      filters.users_permissions_user = userId;
    }

    // Get the order
    const orders = await strapi.entityService.findMany('api::order.order', {
      filters,
      populate: ['products', 'products.product', 'products.product.images', 'shippingAddress', 'orderStatus', 'users_permissions_user'],
    });

    if (!orders || orders.length === 0) {
      throw new Error('Order not found');
    }

    return orders[0];
  },

  /**
   * Update order payment status
   */
  async updateOrderPaymentStatus(orderId: number, paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded') {
    try {
      const order = await strapi.entityService.update('api::order.order', orderId, {
        data: {
          paymentStatus,
          publishedAt: new Date(),
        },
      });

      console.log(`Order ${orderId} payment status updated to: ${paymentStatus}`);
      return order;
    } catch (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }
  },
}));
