/**
 * cart controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::cart.cart', ({ strapi }) => ({
  /**
   * Get the current user's cart
   */
  async getMyCart(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const cart = await strapi.service('api::cart.cart').getUserCart(user.id);

      return this.transformResponse(cart);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Add an item to the cart
   */
  async addItem(ctx) {
    try {
      const { user } = ctx.state;
      const { productId, quantity = 1 } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      const cart = await strapi.service('api::cart.cart').addItem(
        user.id,
        parseInt(productId),
        parseInt(quantity)
      );

      return this.transformResponse(cart);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.params;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      const cart = await strapi.service('api::cart.cart').removeItem(
        user.id,
        parseInt(productId)
      );

      return this.transformResponse(cart);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Update item quantity in the cart
   */
  async updateItemQuantity(ctx) {
    try {
      const { user } = ctx.state;
      const { productId } = ctx.params;
      const { quantity } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      if (quantity === undefined) {
        return ctx.badRequest('Quantity is required');
      }

      const cart = await strapi.service('api::cart.cart').updateItemQuantity(
        user.id,
        parseInt(productId),
        parseInt(quantity)
      );

      return this.transformResponse(cart);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Clear all items from the cart
   */
  async clearCart(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const cart = await strapi.service('api::cart.cart').clearCart(user.id);

      return this.transformResponse(cart);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get cart totals
   */
  async getCartTotals(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const totals = await strapi.service('api::cart.cart').getCartTotals(user.id);

      return this.transformResponse(totals);
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));

