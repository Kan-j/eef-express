/**
 * product controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  /**
   * Find all products with pagination, filters, and search
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

      if (!id) {
        return ctx.badRequest('Product ID is required');
      }

      const data = await strapi.service('api::product.product').getProductDetails(parseInt(id));

      return this.transformResponse(data);
    } catch (error) {
      if (error.message === 'Product not found') {
        return ctx.notFound('Product not found');
      }
      ctx.throw(500, error);
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
