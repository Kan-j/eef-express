/**
 * order router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::order.order');

export default {
  routes: [
    // User routes
    {
      method: 'POST',
      path: '/orders',
      handler: 'api::order.order.createOrder',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/me',
      handler: 'api::order.order.myOrders',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:id/cancel',
      handler: 'api::order.order.cancelOrder',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    // Admin routes
    {
      method: 'GET',
      path: '/orders/admin/all',
      handler: 'api::order.order.findAll',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/admin/stats',
      handler: 'api::order.order.getOrderStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/admin/search',
      handler: 'api::order.order.searchOrders',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:id/status',
      handler: 'api::order.order.updateStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:id/delivery-status',
      handler: 'api::order.order.updateDeliveryStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:id/payment-status',
      handler: 'api::order.order.updatePaymentStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    // Shared routes (both user and admin can access with different permissions)
    {
      method: 'GET',
      path: '/orders/:id',
      handler: 'api::order.order.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
