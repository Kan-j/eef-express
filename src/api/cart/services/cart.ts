/**
 * cart service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::cart.cart', ({ strapi }) => ({
  /**
   * Get or create a cart for a user
   */
  async getUserCart(userId: number) {
    // Find existing cart for the user
    const existingCarts = await strapi.entityService.findMany('api::cart.cart', {
      filters: {
        users_permissions_user: { id: userId },
      },
      populate: ['item', 'item.product', 'item.product.images'],
    });

    // If cart exists, return it
    if (existingCarts && existingCarts.length > 0) {
      return existingCarts[0];
    }

    // If no cart exists, create a new one
    const newCart = await strapi.entityService.create('api::cart.cart', {
      data: {
        users_permissions_user: { id: userId },
        item: [],
        publishedAt: new Date(),
      },
    });

    return newCart;
  },

  /**
   * Add an item to the cart
   */
  async addItem(userId: number, productId: number, quantity: number) {
    // Get the user's cart
    const cart = await this.getUserCart(userId);

    // Check if the product exists
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['images'],
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if the product is already in the cart
    const existingItems = (cart as any).item || [];
    const existingItemIndex = existingItems.findIndex((item: any) => item.product?.id === productId);

    let updatedItems;

    if (existingItemIndex >= 0) {
      // Update quantity if product already in cart
      updatedItems = [...existingItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
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
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(userId: number, productId: number) {
    // Get the user's cart
    const cart = await this.getUserCart(userId);

    // Filter out the item to remove
    const existingItems = (cart as any).item || [];
    const updatedItems = existingItems.filter((item: any) => item.product?.id !== productId);

    // Update the cart
    const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
      data: {
        item: updatedItems,
      },
      populate: ['item', 'item.product', 'item.product.images'],
    });

    return updatedCart;
  },

  /**
   * Update item quantity in the cart
   */
  async updateItemQuantity(userId: number, productId: number, quantity: number) {
    // Get the user's cart
    const cart = await this.getUserCart(userId);

    // Find the item to update
    const existingItems = (cart as any).item || [];
    const itemIndex = existingItems.findIndex((item: any) => item.product?.id === productId);

    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
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
}));
