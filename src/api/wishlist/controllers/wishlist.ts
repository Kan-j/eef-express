/**
 * wishlist controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::wishlist.wishlist', ({ strapi }) => ({
  /**
   * Get the current user's wishlist
   */
  async getMyWishlist(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const wishlist = await strapi.service('api::wishlist.wishlist').getUserWishlist(user.id);

      return this.transformResponse(wishlist);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Add a product to the wishlist with variation support
   */
  async addToWishlist(ctx) {
    try {
      const { user } = ctx.state;
      const { productId, variationId } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      try {
        const wishlist = await strapi.service('api::wishlist.wishlist').addProduct(
          user.id,
          parseInt(productId),
          variationId
        );

        return this.transformResponse(wishlist);
      } catch (serviceError) {
        // Handle specific errors from the service
        const errorMessage = serviceError.message || 'Unknown error';

        if (errorMessage.includes('not found')) {
          return ctx.notFound(errorMessage);
        } else if (errorMessage.includes('already in')) {
          return ctx.badRequest(errorMessage);
        } else if (errorMessage.includes('not available')) {
          return ctx.badRequest(errorMessage);
        } else if (errorMessage.includes('Variation ID is required')) {
          return ctx.badRequest(errorMessage);
        } else {
          // Log unexpected errors
          console.error('Unhandled service error in addToWishlist:', serviceError.message);
          return ctx.badRequest('Unable to add item to wishlist. Please try again.');
        }
      }
    } catch (error) {
      console.error('Unhandled error in addToWishlist controller:', error);
      ctx.throw(500, 'An error occurred while adding the product to wishlist');
    }
  },

  /**
   * Remove a product from the wishlist with variation support
   */
  async removeFromWishlist(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.params;
      const { variationId } = ctx.query;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      try {
        const wishlist = await strapi.service('api::wishlist.wishlist').removeProduct(
          user.id,
          parseInt(productId),
          variationId
        );

        return this.transformResponse(wishlist);
      } catch (serviceError) {
        const errorMessage = serviceError.message || 'Unknown error';

        if (errorMessage.includes('not found')) {
          return ctx.notFound(errorMessage);
        } else {
          console.error('Unhandled service error in removeFromWishlist:', serviceError.message);
          return ctx.badRequest('Unable to remove item from wishlist. Please try again.');
        }
      }
    } catch (error) {
      console.error('Unhandled error in removeFromWishlist controller:', error);
      ctx.throw(500, 'An error occurred while processing your request');
    }
  },

  /**
   * Clear all products from the wishlist
   */
  async clearWishlist(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const wishlist = await strapi.service('api::wishlist.wishlist').clearWishlist(user.id);

      return this.transformResponse(wishlist);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Check if a product (with optional variation) is in the wishlist
   */
  async checkInWishlist(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.params;
      const { variationId } = ctx.query;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      const isInWishlist = await strapi.service('api::wishlist.wishlist').isProductInWishlist(
        user.id,
        parseInt(productId),
        variationId
      );

      return this.transformResponse({ isInWishlist });
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));
