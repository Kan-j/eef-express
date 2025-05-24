/**
 * delivery-types router
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/delivery-types',
      handler: 'api::delivery-types.delivery-types.getAll',
      config: {
        policies: [],
      },
    },
  ],
};
