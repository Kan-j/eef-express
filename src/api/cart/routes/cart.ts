/**
 * cart router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::cart.cart');

export default {
  routes: [
    // Custom routes
    {
      method: 'GET',
      path: '/cart/me',
      handler: 'api::cart.cart.getMyCart',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/cart/items',
      handler: 'api::cart.cart.addItem',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/cart/items/:productId',
      handler: 'api::cart.cart.removeItem',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/cart/items/:productId',
      handler: 'api::cart.cart.updateItemQuantity',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/cart/clear',
      handler: 'api::cart.cart.clearCart',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/cart/totals',
      handler: 'api::cart.cart.getCartTotals',
      config: {
        policies: [],
      },
    },
  ],
};
