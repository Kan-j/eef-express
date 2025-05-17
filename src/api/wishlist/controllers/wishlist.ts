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
   * Add a product to the wishlist
   */
  async addToWishlist(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      try {
        const wishlist = await strapi.service('api::wishlist.wishlist').addProduct(
          user.id,
          parseInt(productId)
        );

        return this.transformResponse(wishlist);
      } catch (serviceError) {
        // Handle specific errors from the service
        if (serviceError.message.includes('not found')) {
          return ctx.notFound(serviceError.message);
        } else if (serviceError.message.includes('already in wishlist')) {
          return ctx.badRequest(serviceError.message);
        } else {
          // Log the error for debugging
          console.error('Error in addToWishlist service:', serviceError);
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Unhandled error in addToWishlist controller:', error);
      ctx.throw(500, 'An error occurred while adding the product to wishlist');
    }
  },

  /**
   * Remove a product from the wishlist
   */
  async removeFromWishlist(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.params;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      try {
        const wishlist = await strapi.service('api::wishlist.wishlist').removeProduct(
          user.id,
          parseInt(productId)
        );

        return this.transformResponse(wishlist);
      } catch (serviceError) {
        if (serviceError.message.includes('not found')) {
          return ctx.notFound(serviceError.message);
        }
        console.error('Error in removeFromWishlist service:', serviceError);
        ctx.throw(500, 'An error occurred while removing the product from wishlist');
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
   * Check if a product is in the wishlist
   */
  async checkInWishlist(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.params;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      const isInWishlist = await strapi.service('api::wishlist.wishlist').isProductInWishlist(
        user.id,
        parseInt(productId)
      );

      return this.transformResponse({ isInWishlist });
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));
