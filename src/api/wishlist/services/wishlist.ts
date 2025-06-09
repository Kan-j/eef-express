/**
 * wishlist service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::wishlist.wishlist', ({ strapi }) => ({
  /**
   * Get or create a wishlist for a user
   * Ensures a user only has one wishlist by deleting any extra wishlists
   */
  async getUserWishlist(userId: number) {
    try {
      // Find existing wishlists for the user
      const existingWishlists = await strapi.entityService.findMany('api::wishlist.wishlist', {
        filters: {
          users_permissions_user: { id: userId },
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      // If user has wishlists
      if (existingWishlists && existingWishlists.length > 0) {
        // Keep the first wishlist
        const primaryWishlist = existingWishlists[0];

        // If user has more than one wishlist, delete the extra wishlists
        if (existingWishlists.length > 1) {
          console.log(`User ${userId} has ${existingWishlists.length} wishlists. Keeping the first one and deleting the rest.`);

          // Delete all wishlists except the first one
          for (let i = 1; i < existingWishlists.length; i++) {
            try {
              await strapi.entityService.delete('api::wishlist.wishlist', existingWishlists[i].id);
              console.log(`Deleted extra wishlist with ID ${existingWishlists[i].id} for user ${userId}`);
            } catch (deleteError) {
              console.error(`Failed to delete extra wishlist with ID ${existingWishlists[i].id}:`, deleteError);
            }
          }
        }

        return primaryWishlist;
      }

      // If no wishlist exists, create a new one
      console.log(`Creating new wishlist for user ${userId}`);
      const newWishlist = await strapi.entityService.create('api::wishlist.wishlist', {
        data: {
          users_permissions_user: { id: userId },
          publishedAt: new Date(),
        },
      });

      return newWishlist;
    } catch (error) {
      console.error(`Error in getUserWishlist for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Add a product to the wishlist with variation support
   */
  async addProduct(userId: number, productId: number, variationId?: string | number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Convert variationId to string if provided
      const variationIdString = variationId ? String(variationId) : null;

      // Check if the product exists and get variation details
      const { product, variation } = await strapi.service('api::product.product').checkProductStock(
        productId,
        1, // We don't need quantity check for wishlist, just use 1
        variationIdString
      );

      // Get current items in wishlist
      const currentWishlist = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['item', 'item.product'],
      });

      const existingItems = (currentWishlist as any).item || [];

      // Check if the same product+variation combination is already in wishlist
      const existingItemIndex = existingItems.findIndex((item: any) => {
        const productMatch = (item.product && typeof item.product === 'object')
          ? item.product.id === productId
          : item.product === productId;

        const variationMatch = String(item.variation_id || '') === String(variationIdString || '');

        return productMatch && variationMatch;
      });

      if (existingItemIndex !== -1) {
        if (variationIdString) {
          throw new Error('This product variation is already in your wishlist');
        } else {
          throw new Error('Product is already in wishlist');
        }
      }

      // Create new wishlist item
      const newItem: any = {
        product: productId,
        quantity: 1, // Wishlist items always have quantity 1
        variation_id: variationIdString,
      };

      // If item has a variation, store the variation details
      if (variation) {
        newItem.variation_details = {
          size: variation.size,
          color: variation.color,
          sku: variation.sku,
          price_adjustment: variation.price_adjustment,
          original_price_adjustment: variation.original_price_adjustment,
          on_sale: variation.on_sale,
          stock_at_time_of_add: variation.stock,
        };
      }

      // Add item to wishlist
      const updatedWishlist = await strapi.entityService.update('api::wishlist.wishlist', wishlist.id, {
        data: {
          item: [
            ...existingItems,
            newItem,
          ],
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      return updatedWishlist;
    } catch (error) {
      // Only log unexpected errors, not user validation errors
      if (error.message && (
          error.message.includes('not found') ||
          error.message.includes('already in') ||
          error.message.includes('not available') ||
          error.message.includes('Variation ID is required')
        )) {
        // These are expected user errors, just throw without logging
        throw error;
      } else {
        // Log unexpected errors
        console.error('Unexpected error in addProduct:', error);
        throw error;
      }
    }
  },

  /**
   * Remove a product from the wishlist with variation support
   */
  async removeProduct(userId: number, productId: number, variationId?: string | number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Convert variationId to string if provided
      const variationIdString = variationId ? String(variationId) : null;

      // Get current items in wishlist
      const currentWishlist = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['item', 'item.product'],
      });

      const existingItems = (currentWishlist as any).item || [];

      // Find the item to remove
      const itemIndex = existingItems.findIndex((item: any) => {
        const productMatch = (item.product && typeof item.product === 'object')
          ? item.product.id === productId
          : item.product === productId;

        if (!variationIdString) {
          // If no variation specified, find first item with this product (backward compatibility)
          return productMatch;
        }

        // If variation specified, must match both product and variation
        const variationMatch = String(item.variation_id || '') === variationIdString;
        return productMatch && variationMatch;
      });

      if (itemIndex === -1) {
        if (variationIdString) {
          throw new Error(`Item not found in wishlist: Product ID ${productId} with variation ID ${variationIdString}`);
        } else {
          throw new Error(`Product not found in wishlist: Product ID ${productId}`);
        }
      }

      // Remove the item from the array
      const updatedItems = existingItems.filter((_, index) => index !== itemIndex);

      // Update the wishlist
      const updatedWishlist = await strapi.entityService.update('api::wishlist.wishlist', wishlist.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      return updatedWishlist;
    } catch (error) {
      // Only log unexpected errors, not user validation errors
      if (error.message && error.message.includes('not found')) {
        // These are expected user errors, just throw without logging
        throw error;
      } else {
        // Log unexpected errors
        console.error('Unexpected error in removeProduct:', error);
        throw error;
      }
    }
  },

  /**
   * Clear all items from the wishlist
   */
  async clearWishlist(userId: number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Clear all items
      const updatedWishlist = await strapi.entityService.update('api::wishlist.wishlist', wishlist.id, {
        data: {
          item: [],
        },
        populate: ['item'],
      });

      return updatedWishlist;
    } catch (error) {
      console.error('Error in clearWishlist:', error);
      throw error;
    }
  },

  /**
   * Check if a product (with optional variation) is in the wishlist
   */
  async isProductInWishlist(userId: number, productId: number, variationId?: string | number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Convert variationId to string if provided
      const variationIdString = variationId ? String(variationId) : null;

      // Get current items in wishlist
      const currentWishlist = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['item', 'item.product'],
      });

      const existingItems = (currentWishlist as any).item || [];

      // Check if the specific product+variation combination is in wishlist
      const isInWishlist = existingItems.some((item: any) => {
        const productMatch = (item.product && typeof item.product === 'object')
          ? item.product.id === productId
          : item.product === productId;

        if (!variationIdString) {
          // If no variation specified, check if any item with this product exists
          return productMatch;
        }

        // If variation specified, must match both product and variation
        const variationMatch = String(item.variation_id || '') === variationIdString;
        return productMatch && variationMatch;
      });

      return isInWishlist;
    } catch (error) {
      console.error('Error in isProductInWishlist:', error);
      throw error;
    }
  },
}));
