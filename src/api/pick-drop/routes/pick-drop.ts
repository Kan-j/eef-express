/**
 * pick-drop router
 */

import { factories } from '@strapi/strapi';

const defaultRouter = factories.createCoreRouter('api::pick-drop.pick-drop');

export default {
  routes: [
    // Custom routes
    {
      method: 'POST',
      path: '/pick-drops',
      handler: 'api::pick-drop.pick-drop.createRequest',
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
      path: '/pick-drops/me',
      handler: 'api::pick-drop.pick-drop.myPickDrops',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/pick-drops/calculate-price',
      handler: 'api::pick-drop.pick-drop.calculatePrice',
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
  ],
};
