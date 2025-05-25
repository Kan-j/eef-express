/**
 * pick-drop router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::pick-drop.pick-drop');

export default {
  routes: [
    // Custom routes for authenticated users
    {
      method: 'POST',
      path: '/pick-drops',
      handler: 'api::pick-drop.pick-drop.createRequest',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/pick-drops/me',
      handler: 'api::pick-drop.pick-drop.myPickDrops',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/pick-drops/calculate-delivery-price',
      handler: 'api::pick-drop.pick-drop.calculateDeliveryPrice',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/pick-drops/:id/delivery-type',
      handler: 'api::pick-drop.pick-drop.updateDeliveryType',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/pick-drops/:id',
      handler: 'api::pick-drop.pick-drop.updateRequest',
      config: {
        policies: [],
      },
    },
    // Override the default findOne route to add our custom logic
    {
      method: 'GET',
      path: '/pick-drops/:id',
      handler: 'api::pick-drop.pick-drop.findOne',
      config: {
        policies: [],
      },
    },
    // Admin routes (for completeness but focus is on user endpoints)
    {
      method: 'PUT',
      path: '/pick-drops/:id/approve',
      handler: 'api::pick-drop.pick-drop.approveRequest',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/pick-drops/:id/status',
      handler: 'api::pick-drop.pick-drop.updateStatus',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/pick-drops',
      handler: 'api::pick-drop.pick-drop.findAll',
      config: {
        policies: [],
      },
    },
  ],
};
