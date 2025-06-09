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
      const { productId, quantity, variationId } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in to add items to cart');
      }

      if (!productId || !quantity) {
        return ctx.badRequest('Product ID and quantity are required');
      }

      try {
        const cart = await strapi.service('api::cart.cart').addItem(
          user.id,
          parseInt(productId),
          parseInt(quantity),
          variationId // Service will handle string conversion
        );

        return this.transformResponse(cart);
      } catch (serviceError) {
        // Handle specific errors from the service with proper status codes
        const errorMessage = serviceError.message || 'Unknown error';

        if (errorMessage.includes('not found') || errorMessage.includes('Product not found')) {
          return ctx.notFound(errorMessage);
        } else if (errorMessage.includes('not available') || errorMessage.includes('not published')) {
          return ctx.badRequest(errorMessage);
        } else if (errorMessage.includes('stock') ||
                   errorMessage.includes('quantity') ||
                   errorMessage.includes('available') ||
                   errorMessage.includes('items') ||
                   errorMessage.includes('variation')) {
          // This should catch stock-related errors including "Only X items available in this variation"
          // These are expected user errors, so we don't need to log them as errors
          return ctx.badRequest(errorMessage);
        } else if (errorMessage.includes('Variation ID is required')) {
          return ctx.badRequest(errorMessage);
        } else if (errorMessage.includes('must be a `string` type') || errorMessage.includes('variation_id')) {
          // Handle schema validation errors for variation_id
          return ctx.badRequest('Variation ID must be provided as a string');
        } else {
          // For any other service errors, log and return a generic bad request instead of 500
          console.error('Unhandled service error in addItem:', serviceError.message);
          return ctx.badRequest('Unable to add item to cart. Please try again.');
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
      const { variationId } = ctx.query;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!productId) {
        return ctx.badRequest('Product ID is required');
      }

      try {
        const cart = await strapi.service('api::cart.cart').removeSpecificItem(
          user.id,
          parseInt(productId),
          variationId
        );

        return this.transformResponse(cart);
      } catch (serviceError) {
        // Handle specific errors from the service
        const errorMessage = serviceError.message || 'Unknown error';

        if (errorMessage.includes('not found')) {
          return ctx.notFound(errorMessage);
        } else {
          console.error('Unhandled service error in removeItem:', serviceError.message);
          return ctx.badRequest('Unable to remove item from cart. Please try again.');
        }
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
      const { quantity, variationId } = ctx.request.body;

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
          parseInt(quantity),
          variationId // Pass variationId to service
        );

        return this.transformResponse(cart);
      } catch (serviceError) {
        // Handle specific errors from the service
        const errorMessage = serviceError.message || 'Unknown error';

        if (errorMessage.includes('not found') || errorMessage.includes('Item not found')) {
          return ctx.notFound(errorMessage);
        } else if (errorMessage.includes('stock') ||
                   errorMessage.includes('quantity') ||
                   errorMessage.includes('available') ||
                   errorMessage.includes('items') ||
                   errorMessage.includes('variation')) {
          // These are expected user errors, no need to log as errors
          return ctx.badRequest(errorMessage);
        } else if (errorMessage.includes('not available') || errorMessage.includes('not published')) {
          return ctx.badRequest(errorMessage);
        } else {
          // For any other service errors, log and return a generic bad request instead of 500
          console.error('Unhandled service error in updateItemQuantity:', serviceError.message);
          return ctx.badRequest('Unable to update cart item. Please try again.');
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
      console.error('Error in clearCart:', error);
      ctx.throw(500, 'An error occurred while clearing the cart');
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
      console.error('Error in getCartTotals:', error);
      ctx.throw(500, 'An error occurred while calculating cart totals');
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
      console.error('Error in validateCart:', error);

      const errorMessage = error.message || 'Unknown error';
      if (errorMessage === 'Cart is empty') {
        return ctx.badRequest(errorMessage);
      } else if (errorMessage.includes('stock') || errorMessage.includes('available')) {
        return ctx.badRequest(errorMessage);
      }
      ctx.throw(500, 'An error occurred while validating the cart');
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
      console.error('Error in getDeliveryOptions:', error);
      ctx.throw(500, 'An error occurred while fetching delivery options');
    }
  },
}));

