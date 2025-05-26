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
  },

  /**
   * Override default find to populate images
   */
  async find(ctx) {
    try {
      const { query } = ctx;

      // Add image population to the query
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const populateQuery = typeof sanitizedQuery.populate === 'object' && sanitizedQuery.populate !== null
        ? { ...sanitizedQuery.populate, image: true }
        : { image: true };

      const { results, pagination } = await strapi.entityService.findPage('api::category.category', {
        ...sanitizedQuery,
        populate: populateQuery,
      });

      const sanitizedResults = await this.sanitizeOutput(results, ctx);
      return this.transformResponse(sanitizedResults, { pagination });
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Override default findOne to populate images
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const { query } = ctx;

      // Add image population to the query
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const populateQuery = typeof sanitizedQuery.populate === 'object' && sanitizedQuery.populate !== null
        ? { ...sanitizedQuery.populate, image: true }
        : { image: true };

      const entity = await strapi.entityService.findOne('api::category.category', id, {
        ...sanitizedQuery,
        populate: populateQuery,
      });

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitizedEntity);
    } catch (error) {
      ctx.throw(500, error);
    }
  }
}));
