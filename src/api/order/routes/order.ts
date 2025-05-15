/**
 * order router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::order.order');

export default {
  routes: [
    // Custom routes
    {
      method: 'POST',
      path: '/orders',
      handler: 'api::order.order.createOrder',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/orders/:id/status',
      handler: 'api::order.order.updateStatus',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/me',
      handler: 'api::order.order.myOrders',
      config: {
        policies: [],
      },
    },
    // Override the default findOne route to add our custom logic
    {
      method: 'GET',
      path: '/orders/:id',
      handler: 'api::order.order.findOne',
      config: {
        policies: [],
      },
    },
  ],
};
