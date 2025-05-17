/**
 * product service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  /**
   * Find all products with pagination, filters, and search
   */
  async findProducts(params: any) {
    // Initialize empty filters object
    const filters: any = {};


    // Price range filter
    if (params.minPrice || params.maxPrice) {
      filters.price = {};
      if (params.minPrice) filters.price.$gte = parseFloat(params.minPrice);
      if (params.maxPrice) filters.price.$lte = parseFloat(params.maxPrice);
    }

    // Category filter
    if (params.category) {
      filters.category = { id: parseInt(params.category) };
    }

    // Search by name or description
    if (params.search) {
      filters.$or = [
        { name: { $containsi: params.search } },
        { description: { $containsi: params.search } }
      ];
    }

    // In stock only
    if (params.inStock === 'true') {
      filters.stock = { $gt: 0 };
    }

    // Rating filter
    if (params.minRating) {
      filters.ratings = { $gte: parseFloat(params.minRating) };
    }

    // Get products with filters using the standard entityService
    const { results, pagination } = await strapi.entityService.findPage('api::product.product', {
      filters,
      populate: ['images', 'category'],
      sort: params.sort ? params.sort : 'createdAt:desc',
      page: params.page ? parseInt(params.page) : 1,
      pageSize: params.pageSize ? parseInt(params.pageSize) : 10,
    });

    return { results, pagination };
  },

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: number) {
    // Simply get the product by ID without checking publishedAt
    // This allows us to retrieve both published and unpublished products
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['images', 'category', 'reviews'],
    });

    if (!product) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    return product;
  },

  /**
   * Get related products based on category
   */
  async getRelatedProducts(productId: number, limit = 4) {
    try {
      // Get the product to find its category
      const product: any = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['category']
      });

      if (!product) {
        return [];
      }

      // Check if the product has a category
      if (!product.category) {
        return [];
      }

      // Find products in the same category, excluding the current product
      const relatedProducts = await strapi.entityService.findMany('api::product.product', {
        filters: {
          id: { $ne: productId },
          category: { id: product.category.id }
        },
        populate: ['images', 'category'],
        limit
      });

      return relatedProducts;
    } catch (error) {
      console.error(`Error getting related products for product ${productId}:`, error.message);
      return [];
    }
  },

  /**
   * Get top-rated products
   */
  async getTopRatedProducts(limit = 5) {
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        ratings: { $gte: 4 } // Products with ratings of 4 or higher
      },
      populate: ['images', 'category'],
      sort: 'ratings:desc',
      limit
    });

    return products;
  },

  /**
   * Get newest products
   */
  async getNewestProducts(limit = 5) {
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        stock: { $gt: 0 } // Only in-stock products
      },
      populate: ['images', 'category'],
      sort: 'createdAt:desc',
      limit
    });

    return products;
  }
}));
