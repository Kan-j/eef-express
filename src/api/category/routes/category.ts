/**
 * category router
 */

export default {
  routes: [
    // Custom routes
    {
      method: 'GET',
      path: '/categories/all',
      handler: 'api::category.category.getAll',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/categories/with-counts',
      handler: 'api::category.category.getWithCounts',
      config: {
        policies: [],
      },
    },
    // Keep the default routes
    {
      method: 'GET',
      path: '/categories',
      handler: 'api::category.category.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/categories/:id',
      handler: 'api::category.category.findOne',
      config: {
        policies: [],
      },
    },
  ],
};
