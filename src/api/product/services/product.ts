/**
 * product service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::product.product', ({ strapi }) => ({
  /**
   * Find all products with pagination, filters, and search
   */
  async findProducts(params: any) {
    // Initialize filters with publishedAt not null to only get published products
    const filters: any = {
      publishedAt: { $notNull: true }
    };

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
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['images', 'category', 'reviews'],
    });

    if (!product || !product.publishedAt) {
      throw new Error('Product not found');
    }

    return product;
  },

  /**
   * Get related products based on category
   */
  async getRelatedProducts(productId: number, limit = 4) {
    // Get the product to find its category
    const product: any = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['category']
    });

    if (!product || !product.category) {
      return [];
    }

    // Find products in the same category, excluding the current product
    const relatedProducts = await strapi.entityService.findMany('api::product.product', {
      filters: {
        id: { $ne: productId },
        category: { id: product.category.id },
        publishedAt: { $notNull: true }
      },
      populate: ['images', 'category'],
      limit
    });

    return relatedProducts;
  },

  /**
   * Get top-rated products
   */
  async getTopRatedProducts(limit = 5) {
    const products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        ratings: { $gte: 4 }, // Products with ratings of 4 or higher
        publishedAt: { $notNull: true }
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
        stock: { $gt: 0 }, // Only in-stock products
        publishedAt: { $notNull: true }
      },
      populate: ['images', 'category'],
      sort: 'createdAt:desc',
      limit
    });

    return products;
  }
}));
