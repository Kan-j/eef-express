/**
 * cart service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::cart.cart', ({ strapi }) => ({
  /**
   * Get or create a cart for a user
   * Ensures a user only has one cart by deleting any extra carts
   */
  async getUserCart(userId: number) {
    try {
      // Find existing carts for the user
      const existingCarts = await strapi.entityService.findMany('api::cart.cart', {
        filters: {
          users_permissions_user: { id: userId },
        },
        populate: ['item', 'item.product', 'item.product.images'],
      });

      // If user has carts
      if (existingCarts && existingCarts.length > 0) {
        // Keep the first cart
        const primaryCart = existingCarts[0];

        // If user has more than one cart, delete the extra carts
        if (existingCarts.length > 1) {
          console.log(`User ${userId} has ${existingCarts.length} carts. Keeping the first one and deleting the rest.`);

          // Delete all carts except the first one
          for (let i = 1; i < existingCarts.length; i++) {
            try {
              await strapi.entityService.delete('api::cart.cart', existingCarts[i].id);
              console.log(`Deleted extra cart with ID ${existingCarts[i].id} for user ${userId}`);
            } catch (deleteError) {
              console.error(`Failed to delete extra cart with ID ${existingCarts[i].id}:`, deleteError);
            }
          }
        }

        return primaryCart;
      }

      // If no cart exists, create a new one
      console.log(`Creating new cart for user ${userId}`);
      const newCart = await strapi.entityService.create('api::cart.cart', {
        data: {
          users_permissions_user: { id: userId },
          item: [],
          publishedAt: new Date(),
        },
      });

      return newCart;
    } catch (error) {
      console.error(`Error in getUserCart for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Check if a product is in stock
   */
  async checkProductStock(productId: number, requestedQuantity: number) {
    try {
      // Check if the product exists and has enough stock
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images'],
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if product is published
      if (!(product as any).publishedAt) {
        throw new Error('Product is not available');
      }

      // Check if product has enough stock
      if ((product as any).stock < requestedQuantity) {
        throw new Error(`Only ${(product as any).stock} items available in stock`);
      }

      return product;
    } catch (error) {
      console.error('Error in checkProductStock:', error);
      throw error;
    }
  },

  /**
   * Add an item to the cart or update its quantity if it already exists
   * If the item already exists in the cart, this will set the quantity directly to the provided value,
   * not add to the existing quantity
   */
  async addItem(userId: number, productId: number, quantity: number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Check if the product exists
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images'],
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if product is published
      if (!(product as any).publishedAt) {
        throw new Error('Product is not available');
      }

      // Check if the product is already in the cart
      const existingItems = (cart as any).item || [];

      // Debug log to see what's in the cart
      console.log('Cart items:', JSON.stringify(existingItems, null, 2));
      console.log('Looking for product ID:', productId);

      const existingItemIndex = existingItems.findIndex((item: any) => {
        // Handle both populated and non-populated product references
        if (item.product && typeof item.product === 'object') {
          console.log('Product is object, comparing', item.product.id, 'with', productId);
          return String(item.product.id) === String(productId);
        } else {
          console.log('Product is not object, comparing', item.product, 'with', productId);
          return String(item.product) === String(productId);
        }
      });

      let updatedItems;
      let totalRequestedQuantity = quantity;

      // If product is already in cart, replace the existing quantity with the new quantity
      if (existingItemIndex >= 0) {
        console.log('Product already in cart, replacing quantity');
        const existingQuantity = existingItems[existingItemIndex].quantity;
        console.log('Existing quantity:', existingQuantity);
        console.log('New quantity:', quantity);
        // Set the requested quantity to the new quantity (not adding to existing)
        totalRequestedQuantity = quantity;
        console.log('Total requested quantity:', totalRequestedQuantity);
        console.log('Available stock:', (product as any).stock);
      }

      // Check if total quantity exceeds stock
      if (totalRequestedQuantity > (product as any).stock) {
        // Whether adding a new item or updating an existing one, the message is the same
        // since we're setting the quantity directly, not adding to it
        throw new Error(`Cannot set quantity to ${quantity}. Only ${(product as any).stock} items are available in stock.`);
      }

      // Update cart items
      if (existingItemIndex >= 0) {
        // Update quantity if product already in cart
        updatedItems = [...existingItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: totalRequestedQuantity,
        };
      } else {
        // Add new item to cart
        updatedItems = [
          ...existingItems,
          {
            product: productId,
            quantity,
          },
        ];
      }


      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images'],
      });

      return updatedCart;
    } catch (error) {
      console.error('Error in addItem:', error);
      throw error;
    }
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(userId: number, productId: number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Filter out the item to remove
      const existingItems = (cart as any).item || [];

      // Check if the item exists in the cart
      const itemExists = existingItems.some((item: any) => {
        if (item.product && typeof item.product === 'object') {
          return String(item.product.id) === String(productId);
        } else {
          return String(item.product) === String(productId);
        }
      });

      if (!itemExists) {
        // If the item doesn't exist, just return the current cart
        return cart;
      }

      // Filter out the item to remove
      const updatedItems = existingItems.filter((item: any) => {
        if (item.product && typeof item.product === 'object') {
          return String(item.product.id) !== String(productId);
        } else {
          return String(item.product) !== String(productId);
        }
      });

      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images'],
      });

      return updatedCart;
    } catch (error) {
      console.error('Error in removeItem:', error);
      throw error;
    }
  },

  /**
   * Update item quantity in the cart
   * This sets the quantity directly to the provided value, not adding to existing quantity
   */
  async updateItemQuantity(userId: number, productId: number, quantity: number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Find the item to update
      const existingItems = (cart as any).item || [];

      // Debug log to see what's in the cart
      console.log('Cart items:', JSON.stringify(existingItems, null, 2));
      console.log('Looking for product ID:', productId);

      const itemIndex = existingItems.findIndex((item: any) => {
        // Handle both populated and non-populated product references
        if (item.product && typeof item.product === 'object') {
          console.log('Product is object, comparing', item.product.id, 'with', productId);
          return String(item.product.id) === String(productId);
        } else {
          console.log('Product is not object, comparing', item.product, 'with', productId);
          return String(item.product) === String(productId);
        }
      });

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      // If quantity is 0 or less, remove the item
      if (quantity <= 0) {
        return this.removeItem(userId, productId);
      }

      // Get the product to check stock
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images'],
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if product is published
      if (!(product as any).publishedAt) {
        throw new Error('Product is not available');
      }

      // Check if product has enough stock
      if ((product as any).stock < quantity) {
        throw new Error(`Cannot update to ${quantity} items. Only ${(product as any).stock} items are available in stock.`);
      }

      // Update the quantity
      const updatedItems = [...existingItems];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        quantity,
      };

      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images'],
      });

      return updatedCart;
    } catch (error) {
      console.error('Error in updateItemQuantity:', error);
      throw error;
    }
  },

  /**
   * Clear all items from the cart
   */
  async clearCart(userId: number) {
    // Get the user's cart
    const cart = await this.getUserCart(userId);

    // Update the cart with empty items
    const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
      data: {
        item: [],
      },
    });

    return updatedCart;
  },

  /**
   * Calculate cart totals
   */
  async getCartTotals(userId: number) {
    // Get the user's cart with populated items
    const cart = await this.getUserCart(userId);

    const items = (cart as any).item || [];
    let subtotal = 0;

    // Calculate subtotal
    for (const item of items) {
      if (item.product && item.quantity) {
        subtotal += parseFloat((item.product as any).price) * item.quantity;
      }
    }

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      itemCount: items.length,
      totalItems: items.reduce((total, item: any) => total + (item.quantity || 0), 0),
    };
  },

  /**
   * Validate cart items before checkout
   */
  async validateCartForCheckout(userId: number) {
    // Get the user's cart with populated items
    const cart = await this.getUserCart(userId);
    const items = (cart as any).item || [];

    if (items.length === 0) {
      throw new Error('Cart is empty');
    }

    const validationResults = {
      valid: true,
      invalidItems: [],
      message: '',
    };

    // Check each item in the cart
    for (const item of items) {
      try {
        if (!item.product || !item.product.id) {
          validationResults.invalidItems.push({
            item,
            reason: 'Product information is missing',
          });
          validationResults.valid = false;
          continue;
        }

        // Check if product still exists and has enough stock
        const product = await strapi.entityService.findOne('api::product.product', item.product.id);

        if (!product) {
          validationResults.invalidItems.push({
            item,
            reason: 'Product no longer exists',
          });
          validationResults.valid = false;
          continue;
        }

        if (!(product as any).publishedAt) {
          validationResults.invalidItems.push({
            item,
            reason: 'Product is no longer available',
          });
          validationResults.valid = false;
          continue;
        }

        if ((product as any).stock < item.quantity) {
          validationResults.invalidItems.push({
            item,
            product,
            reason: `Only ${(product as any).stock} items available in stock`,
          });
          validationResults.valid = false;
          continue;
        }
      } catch (error) {
        validationResults.invalidItems.push({
          item,
          reason: error.message || 'Unknown error',
        });
        validationResults.valid = false;
      }
    }

    if (!validationResults.valid) {
      validationResults.message = 'Some items in your cart are no longer available or have insufficient stock';
    }

    return validationResults;
  },

  /**
   * Get delivery pricing options
   */
  async getDeliveryOptions() {
    const deliveryOptions = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
      sort: { amount: 'asc' },
    });

    return deliveryOptions;
  },
}));
