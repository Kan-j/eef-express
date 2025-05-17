/**
 * category controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::category.category', ({ strapi }) => ({
  /**
   * Get all categories
   */
  async getAll(ctx) {
    try {
      const { query } = ctx;
      const data = await strapi.service('api::category.category').getAllCategories(query);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get categories with product counts
   */
  async getWithCounts(ctx) {
    try {
      const data = await strapi.service('api::category.category').getCategoriesWithCounts();

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  }
}));
