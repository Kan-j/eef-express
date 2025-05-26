/**
 * category service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::category.category', ({ strapi }) => ({
  /**
   * Get all categories with optional sorting
   */
  async getAllCategories(params: any = {}) {
    try {
      // Default sort by displayOrder if available, otherwise by name
      const sort = params.sort || 'displayOrder:asc,name:asc';

      // Find all categories
      const categories = await strapi.entityService.findMany('api::category.category', {
        sort,
        populate: params.withProducts ? ['image', 'products', 'products.images'] : ['image'],
      });

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  /**
   * Get categories with product counts
   */
  async getCategoriesWithCounts() {
    try {
      // Find all categories
      const categories = await strapi.entityService.findMany('api::category.category', {
        sort: 'displayOrder:asc,name:asc',
        populate: ['image', 'products'],
      });

      // Add product count to each category
      const categoriesWithCounts = categories.map((category: any) => {
        const productCount = category.products ? category.products.length : 0;
        // Remove the products array to reduce payload size
        const { products, ...categoryData } = category;
        return {
          ...categoryData,
          productCount,
        };
      });

      return categoriesWithCounts;
    } catch (error) {
      console.error('Error fetching categories with counts:', error);
      throw error;
    }
  }
}));
