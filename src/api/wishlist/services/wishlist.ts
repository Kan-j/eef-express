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
        populate: ['products', 'products.images'],
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
   * Add a product to the wishlist
   */
  async addProduct(userId: number, productId: number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Check if the product exists
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images'],
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Get current products in wishlist
      const currentProducts = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['products'],
      });

      // Check if product is already in wishlist
      const productIds = (currentProducts as any).products.map((p: any) => p.id);
      if (productIds.includes(productId)) {
        throw new Error('Product is already in wishlist');
      }

      // Add product to wishlist
      const updatedWishlist = await strapi.entityService.update('api::wishlist.wishlist', wishlist.id, {
        data: {
          products: {
            connect: [productId],
          } as any,
        },
        populate: ['products', 'products.images'],
      });

      return updatedWishlist;
    } catch (error) {
      console.error('Error in addProduct:', error);
      throw error;
    }
  },

  /**
   * Remove a product from the wishlist
   */
  async removeProduct(userId: number, productId: number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Get current products in wishlist
      const currentProducts = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['products'],
      });

      // Check if product is in wishlist
      const productIds = (currentProducts as any).products.map((p: any) => p.id);
      if (!productIds.includes(productId)) {
        throw new Error('Product not found in wishlist');
      }

      // Remove product from wishlist
      const updatedWishlist = await strapi.entityService.update('api::wishlist.wishlist', wishlist.id, {
        data: {
          products: {
            disconnect: [productId],
          } as any,
        },
        populate: ['products', 'products.images'],
      });

      return updatedWishlist;
    } catch (error) {
      console.error('Error in removeProduct:', error);
      throw error;
    }
  },

  /**
   * Clear all products from the wishlist
   */
  async clearWishlist(userId: number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Clear all products
      // First get all product IDs
      const currentProducts = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['products'],
      });

      const productIds = (currentProducts as any).products.map((p: any) => p.id);

      // Then disconnect all products if there are any
      const updatedWishlist = await strapi.entityService.update('api::wishlist.wishlist', wishlist.id, {
        data: {
          products: productIds.length > 0 ? {
            disconnect: productIds,
          } as any : undefined,
        },
        populate: ['products'],
      });

      return updatedWishlist;
    } catch (error) {
      console.error('Error in clearWishlist:', error);
      throw error;
    }
  },

  /**
   * Check if a product is in the wishlist
   */
  async isProductInWishlist(userId: number, productId: number) {
    try {
      // Get the user's wishlist
      const wishlist = await this.getUserWishlist(userId);

      // Get current products in wishlist
      const currentProducts = await strapi.entityService.findOne('api::wishlist.wishlist', wishlist.id, {
        populate: ['products'],
      });

      // Check if product is in wishlist
      const productIds = (currentProducts as any).products.map((p: any) => p.id);
      return productIds.includes(productId);
    } catch (error) {
      console.error('Error in isProductInWishlist:', error);
      throw error;
    }
  },
}));
