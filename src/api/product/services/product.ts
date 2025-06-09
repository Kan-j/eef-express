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

    // On sale filter
    if (params.onSale === 'true') {
      filters.on_sale = true;
    }

    // Get products with filters using the standard entityService
    const { results, pagination } = await strapi.entityService.findPage('api::product.product', {
      filters,
      populate: ['images', 'category', 'variations'],
      sort: params.sort ? params.sort : 'createdAt:desc',
      page: params.page ? parseInt(params.page) : 1,
      pageSize: params.pageSize ? parseInt(params.pageSize) : 10,
    });

    // Enhance results with discount information
    const now = new Date();
    const enhancedResults = results.map((product: any) => {
      // Check if product is on sale and sale is active
      const isOnSale = product.on_sale && 
        (!product.sale_start_date || new Date(product.sale_start_date) <= now) &&
        (!product.sale_end_date || new Date(product.sale_end_date) >= now);
      
      // Calculate discount percentage if not already set
      let discountPercentage = product.discount_percentage;
      if (isOnSale && product.original_price && !discountPercentage) {
        discountPercentage = Math.round(((product.original_price - product.price) / product.original_price) * 100);
      }
      
      return {
        ...product,
        isOnSale: isOnSale,
        discountPercentage: discountPercentage || 0,
        originalPrice: product.original_price || null
      };
    });

    return { results: enhancedResults, pagination };
  },

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: number) {
    // Simply get the product by ID without checking publishedAt
    // This allows us to retrieve both published and unpublished products
    const product = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['images', 'category', 'reviews', 'variations'],
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
      populate: ['images', 'category', 'reviews'],
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
  },

  /**
   * Check product stock considering variations
   */
  async checkProductStock(productId: number, quantity: number, variationId?: string) {
    const product: any = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['variations'],
    });

    if (!product) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    // If product has variations and a specific variation is requested
    if (product.has_variations && variationId && product.variations) {
      const variation = product.variations.find((v: any) => String(v.id) === String(variationId));
      if (!variation) {
        throw new Error(`Variation not found for product ID: ${productId}. Available variations: ${product.variations.map((v: any) => v.id).join(', ')}`);
      }

      if (variation.stock < quantity) {
        throw new Error(`Only ${variation.stock} items available in this variation`);
      }

      return { product, variation };
    }
    // If product has variations but no specific variation is requested
    else if (product.has_variations) {
      throw new Error('Variation ID is required for this product');
    }
    // Regular product without variations
    else {
      if (product.stock < quantity) {
        throw new Error(`Only ${product.stock} items available in stock`);
      }

      return { product };
    }
  },

  /**
   * Get product price considering variations and discounts
   */
  async getProductPrice(productId: number, variationId?: string, includePriceInfo = false) {
    const product: any = await strapi.entityService.findOne('api::product.product', productId, {
      populate: ['variations'],
    });

    if (!product) {
      throw new Error(`Product not found with ID: ${productId}`);
    }

    // Check if product is on sale and sale is active
    const now = new Date();
    const isProductOnSale = product.on_sale &&
      (!product.sale_start_date || new Date(product.sale_start_date) <= now) &&
      (!product.sale_end_date || new Date(product.sale_end_date) >= now);

    // Default price info
    const priceInfo = {
      currentPrice: product.price,
      originalPrice: product.original_price || product.price,
      discountPercentage: isProductOnSale ? product.discount_percentage || 0 : 0,
      onSale: isProductOnSale
    };

    // If product has variations and a specific variation is requested
    if (product.has_variations && variationId && product.variations) {
      const variation = product.variations.find((v: any) => String(v.id) === String(variationId));
      if (!variation) {
        throw new Error(`Variation not found for product ID: ${productId}. Available variations: ${product.variations.map((v: any) => v.id).join(', ')}`);
      }

      // Check if variation has its own sale
      const isVariationOnSale = variation.on_sale || isProductOnSale;

      // Calculate current price (base price + adjustment)
      const currentPrice = product.price + (variation.price_adjustment || 0);

      // Calculate original price
      let originalPrice = product.original_price || product.price;
      if (variation.original_price_adjustment) {
        originalPrice += variation.original_price_adjustment;
      } else {
        originalPrice += variation.price_adjustment || 0;
      }

      // Update price info for variation
      priceInfo.currentPrice = currentPrice;
      priceInfo.originalPrice = originalPrice;
      priceInfo.onSale = isVariationOnSale;

      // Calculate discount percentage if on sale
      if (isVariationOnSale && originalPrice > currentPrice) {
        priceInfo.discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

      return includePriceInfo ? priceInfo : priceInfo.currentPrice;
    }

    // Regular product without variations
    return includePriceInfo ? priceInfo : priceInfo.currentPrice;
  }
}));
