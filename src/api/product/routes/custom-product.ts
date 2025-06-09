export default {
  routes: [
    {
      method: 'GET',
      path: '/products/newest',
      handler: 'product.newest',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/products/on-sale',
      handler: 'product.getOnSale',
      config: {
        auth: false,
      },
    },
  ],
};