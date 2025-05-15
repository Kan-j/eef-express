/**
 * product router
 */

// No need to import factories since we're defining routes directly

export default {
  routes: [
    // Specific routes must come before parameterized routes
    {
      method: 'GET',
      path: '/products/top-rated',
      handler: 'api::product.product.topRated',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/products/newest',
      handler: 'api::product.product.newest',
      config: {
        policies: [],
      },
    },
    // Default routes - these override the core routes to add our custom implementation
    {
      method: 'GET',
      path: '/products',
      handler: 'api::product.product.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/products/:id',
      handler: 'api::product.product.findOne',
      config: {
        policies: [],
      },
    },
    // Related products route
    {
      method: 'GET',
      path: '/products/:id/related',
      handler: 'api::product.product.related',
      config: {
        policies: [],
      },
    },
  ],
};
