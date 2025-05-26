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
      populate: ['products', 'products.product', 'products.product.images', 'shippingAddress', 'orderStatus'],
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
      populate: ['products', 'products.product', 'products.product.images', 'shippingAddress', 'orderStatus'],
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
      populate: ['products', 'products.product', 'products.product.images', 'shippingAddress', 'orderStatus'],
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

  /**
   * Get all orders with advanced filtering (Admin only)
   */
  async getAllOrders(params: any = {}) {
    const {
      page = 1,
      pageSize = 25,
      sort = 'createdAt:desc',
      paymentStatus,
      deliveryType,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount
    } = params;

    // Build filters
    const filters: any = {};

    if (paymentStatus) {
      filters.paymentStatus = paymentStatus;
    }

    if (deliveryType) {
      filters.deliveryType = deliveryType;
    }

    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) {
        filters.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filters.createdAt.$lte = new Date(dateTo);
      }
    }

    if (minAmount || maxAmount) {
      filters.totalAmount = {};
      if (minAmount) {
        filters.totalAmount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filters.totalAmount.$lte = parseFloat(maxAmount);
      }
    }

    console.log(`🔍 Fetching orders with filters:`, filters);

    const { results, pagination } = await strapi.entityService.findPage('api::order.order', {
      filters,
      populate: [
        'users_permissions_user',
        'products',
        'products.product',
        'products.product.images',
        'shippingAddress',
        'orderStatus',
        'payment'
      ],
      sort,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return { results, pagination };
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number, userId: number, isAdmin: boolean = false, reason: string = '') {
    // Get the order
    const order = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: ['users_permissions_user', 'orderStatus'],
    }) as any;

    if (!order) {
      throw new Error('Order not found');
    }

    // Check if user can cancel this order
    if (!isAdmin && order.users_permissions_user.id !== userId) {
      throw new Error('Unauthorized');
    }

    // Check if order can be cancelled (only pending or processing orders)
    if (!['pending', 'processing'].includes(order.paymentStatus)) {
      throw new Error('Cannot cancel this order');
    }

    // Add cancellation status to order status log
    const updatedStatusLog = [
      ...(order.orderStatus || []),
      {
        shippingStatus: 'Cancelled',
        timestamp: new Date(),
        locationNote: reason || 'Order cancelled by user',
      },
    ];

    // Update the order
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: {
        paymentStatus: 'failed', // Mark as failed to indicate cancellation
        orderStatus: updatedStatusLog,
      },
      populate: ['products', 'products.product', 'shippingAddress', 'orderStatus', 'users_permissions_user'],
    });

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: order.users_permissions_user.id,
        title: 'Order Cancelled',
        message: `Your order #${orderId} has been cancelled. ${reason ? 'Reason: ' + reason : ''}`,
        read: false,
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Order ${orderId} cancelled successfully`);
    return updatedOrder;
  },

  /**
   * Get order statistics
   */
  async getOrderStatistics(params: any = {}) {
    const { dateFrom, dateTo } = params;

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      if (dateFrom) {
        dateFilter.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.$lte = new Date(dateTo);
      }
    }

    // Get all orders for statistics
    const allOrders = await strapi.entityService.findMany('api::order.order', {
      filters: dateFrom || dateTo ? { createdAt: dateFilter } : {},
      populate: ['products'],
    }) as any[];

    // Calculate statistics
    const stats = {
      totalOrders: allOrders.length,
      totalRevenue: allOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0),
      averageOrderValue: 0,
      ordersByStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        refunded: 0,
      },
      ordersByDeliveryType: {
        Standard: 0,
        Scheduled: 0,
        'Next-Day': 0,
        'Same-Day': 0,
        Express: 0,
      },
      ordersByPaymentMethod: {
        card: 0,
        paypal: 0,
        apple_pay: 0,
        google_pay: 0,
        cash_on_delivery: 0,
      },
      recentOrders: allOrders.slice(0, 10), // Last 10 orders
    };

    // Calculate average order value
    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
    }

    // Count orders by status
    allOrders.forEach(order => {
      if (order.paymentStatus && stats.ordersByStatus.hasOwnProperty(order.paymentStatus)) {
        stats.ordersByStatus[order.paymentStatus]++;
      }
      if (order.deliveryType && stats.ordersByDeliveryType.hasOwnProperty(order.deliveryType)) {
        stats.ordersByDeliveryType[order.deliveryType]++;
      }
      if (order.paymentMethod && stats.ordersByPaymentMethod.hasOwnProperty(order.paymentMethod)) {
        stats.ordersByPaymentMethod[order.paymentMethod]++;
      }
    });

    return stats;
  },

  /**
   * Update delivery status with tracking
   */
  async updateDeliveryStatus(orderId: number, status: string, locationNote: string = '', estimatedDelivery?: string) {
    // Get the order
    const order = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: ['orderStatus', 'users_permissions_user'],
    }) as any;

    if (!order) {
      throw new Error('Order not found');
    }

    // Add new status to the order status log
    const statusEntry: any = {
      shippingStatus: status,
      timestamp: new Date(),
      locationNote,
    };

    if (estimatedDelivery) {
      statusEntry.estimatedDelivery = new Date(estimatedDelivery);
    }

    const updatedStatusLog = [
      ...(order.orderStatus || []),
      statusEntry,
    ];

    // Update the order
    const updatedOrder = await strapi.entityService.update('api::order.order', orderId, {
      data: {
        orderStatus: updatedStatusLog,
      },
      populate: ['products', 'products.product', 'shippingAddress', 'orderStatus', 'users_permissions_user'],
    });

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: order.users_permissions_user.id,
        title: 'Order Status Updated',
        message: `Your order #${orderId} status: ${status}. ${locationNote}`,
        read: false,
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Delivery status updated for order ${orderId}: ${status}`);
    return updatedOrder;
  },

  /**
   * Search orders by various criteria
   */
  async searchOrders(params: any = {}) {
    const {
      page = 1,
      pageSize = 25,
      sort = 'createdAt:desc',
      search,
      userId,
      orderId
    } = params;

    // Build filters
    const filters: any = {};

    if (userId) {
      filters.users_permissions_user = { id: parseInt(userId) };
    }

    if (orderId) {
      filters.id = parseInt(orderId);
    }

    // For text search, we'll search in shipping address or user email
    if (search) {
      filters.$or = [
        {
          shippingAddress: {
            $or: [
              { name: { $containsi: search } },
              { addressLine1: { $containsi: search } },
              { addressLine2: { $containsi: search } },
              { phoneNumber: { $containsi: search } },
              { emirate: { $containsi: search } },
            ]
          }
        },
        {
          users_permissions_user: {
            email: { $containsi: search }
          }
        }
      ];
    }

    console.log(`🔍 Searching orders with filters:`, filters);

    const { results, pagination } = await strapi.entityService.findPage('api::order.order', {
      filters,
      populate: [
        'users_permissions_user',
        'products',
        'products.product',
        'products.product.images',
        'shippingAddress',
        'orderStatus',
        'payment'
      ],
      sort,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return { results, pagination };
  },
}));
