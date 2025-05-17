/**
 * wishlist router
 */

export default {
  routes: [
    // Custom routes
    {
      method: 'GET',
      path: '/wishlist/me',
      handler: 'api::wishlist.wishlist.getMyWishlist',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/wishlist/products',
      handler: 'api::wishlist.wishlist.addToWishlist',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/wishlist/products/:productId',
      handler: 'api::wishlist.wishlist.removeFromWishlist',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/wishlist/clear',
      handler: 'api::wishlist.wishlist.clearWishlist',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/wishlist/check/:productId',
      handler: 'api::wishlist.wishlist.checkInWishlist',
      config: {
        policies: [],
      },
    },
  ],
};
