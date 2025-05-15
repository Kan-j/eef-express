/**
 * product controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  /**
   * Find all products with pagination, filters, and search
   *
   * Only returns published products (where publishedAt is not null) to avoid duplicates.
   */
  async find(ctx) {
    try {
      const { query } = ctx;
      const data = await strapi.service('api::product.product').findProducts(query);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get product details by ID
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      console.log(`Product details requested for ID: ${id}`);

      if (!id) {
        console.log('Bad request: Product ID is required');
        return ctx.badRequest('Product ID is required');
      }

      // Parse the ID as an integer
      const productId = parseInt(id);
      if (isNaN(productId)) {
        console.log(`Bad request: Invalid product ID format: ${id}`);
        return ctx.badRequest('Invalid product ID format');
      }

      const data = await strapi.service('api::product.product').getProductDetails(productId);
      console.log('Product details retrieved successfully');

      return this.transformResponse(data);
    } catch (error) {
      console.error('Error in findOne controller:', error.message);

      if (error.message.includes('not found') || error.message.includes('not published')) {
        return ctx.notFound(error.message);
      }

      ctx.throw(500, error.message);
    }
  },

  /**
   * Get related products
   */
  async related(ctx) {
    try {
      const { id } = ctx.params;
      const { query } = ctx;
      const limit = query.limit ? parseInt(query.limit as string) : 4;

      if (!id) {
        return ctx.badRequest('Product ID is required');
      }

      const data = await strapi.service('api::product.product').getRelatedProducts(parseInt(id), limit);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get top-rated products
   */
  async topRated(ctx) {
    try {
      const { query } = ctx;
      const limit = query.limit ? parseInt(query.limit as string) : 5;

      const data = await strapi.service('api::product.product').getTopRatedProducts(limit);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get newest products
   */
  async newest(ctx) {
    try {
      const { query } = ctx;
      const limit = query.limit ? parseInt(query.limit as string) : 5;

      const data = await strapi.service('api::product.product').getNewestProducts(limit);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  }
}));
