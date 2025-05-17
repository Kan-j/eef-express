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

      try {
        const cart = await strapi.service('api::cart.cart').addItem(
          user.id,
          parseInt(productId),
          parseInt(quantity)
        );

        return this.transformResponse(cart);
      } catch (serviceError) {
        // Handle specific errors from the service
        if (serviceError.message.includes('not found')) {
          return ctx.notFound(serviceError.message);
        } else if (serviceError.message.includes('not available')) {
          return ctx.badRequest(serviceError.message);
        } else if (serviceError.message.includes('stock') || serviceError.message.includes('quantity')) {
          return ctx.badRequest(serviceError.message);
        } else {
          // Log the error for debugging
          console.error('Error in addItem service:', serviceError);
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Unhandled error in addItem controller:', error);
      ctx.throw(500, 'An error occurred while adding the item to cart');
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

      try {
        const cart = await strapi.service('api::cart.cart').removeItem(
          user.id,
          parseInt(productId)
        );

        return this.transformResponse(cart);
      } catch (serviceError) {
        console.error('Error in removeItem service:', serviceError);
        ctx.throw(500, 'An error occurred while removing the item from cart');
      }
    } catch (error) {
      console.error('Unhandled error in removeItem controller:', error);
      ctx.throw(500, 'An error occurred while processing your request');
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

      try {
        const cart = await strapi.service('api::cart.cart').updateItemQuantity(
          user.id,
          parseInt(productId),
          parseInt(quantity)
        );

        return this.transformResponse(cart);
      } catch (serviceError) {
        // Handle specific errors from the service
        if (serviceError.message.includes('not found')) {
          return ctx.notFound(serviceError.message);
        } else if (serviceError.message.includes('stock') || serviceError.message.includes('quantity')) {
          return ctx.badRequest(serviceError.message);
        } else {
          // Log the error for debugging
          console.error('Error in updateItemQuantity controller:', serviceError);
          throw serviceError;
        }
      }
    } catch (error) {
      console.error('Unhandled error in updateItemQuantity controller:', error);
      ctx.throw(500, 'An error occurred while updating the cart item');
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

  /**
   * Validate cart for checkout
   */
  async validateCart(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const validationResults = await strapi.service('api::cart.cart').validateCartForCheckout(user.id);

      return this.transformResponse(validationResults);
    } catch (error) {
      if (error.message === 'Cart is empty') {
        return ctx.badRequest(error.message);
      }
      ctx.throw(500, error);
    }
  },

  /**
   * Get delivery options
   */
  async getDeliveryOptions(ctx) {
    try {
      const deliveryOptions = await strapi.service('api::cart.cart').getDeliveryOptions();

      return this.transformResponse(deliveryOptions);
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));

