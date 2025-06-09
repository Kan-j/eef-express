/**
 * cart service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::cart.cart', ({ strapi }) => ({
  /**
   * Get or create a cart for a user
   * Ensures a user only has one cart by deleting any extra carts
   */
  async getUserCart(userId: number) {
    try {
      // Find existing carts for the user
      const existingCarts = await strapi.entityService.findMany('api::cart.cart', {
        filters: {
          users_permissions_user: { id: userId },
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      // If user has carts
      if (existingCarts && existingCarts.length > 0) {
        // Keep the first cart
        const primaryCart = existingCarts[0];

        // If user has more than one cart, delete the extra carts
        if (existingCarts.length > 1) {
          console.log(`User ${userId} has ${existingCarts.length} carts. Keeping the first one and deleting the rest.`);

          // Delete all carts except the first one
          for (let i = 1; i < existingCarts.length; i++) {
            try {
              await strapi.entityService.delete('api::cart.cart', existingCarts[i].id);
              console.log(`Deleted extra cart with ID ${existingCarts[i].id} for user ${userId}`);
            } catch (deleteError) {
              console.error(`Failed to delete extra cart with ID ${existingCarts[i].id}:`, deleteError);
            }
          }
        }

        // Populate missing variation details for existing items
        const updatedCart = await this.populateVariationDetails(primaryCart);
        return updatedCart;
      }

      // If no cart exists, create a new one
      console.log(`Creating new cart for user ${userId}`);
      const newCart = await strapi.entityService.create('api::cart.cart', {
        data: {
          users_permissions_user: { id: userId },
          item: [],
          publishedAt: new Date(),
        },
      });

      return newCart;
    } catch (error) {
      console.error(`Error in getUserCart for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Populate missing variation details for existing cart items
   */
  async populateVariationDetails(cart: any) {
    const items = cart.item || [];
    let hasUpdates = false;
    const updatedItems = [];

    for (const item of items) {
      // If item has variation_id but no variation_details, populate it
      if (item.variation_id && !item.variation_details && item.product && item.product.variations) {
        const variation = item.product.variations.find((v: any) => String(v.id) === String(item.variation_id));
        if (variation) {
          const updatedItem = {
            ...item,
            variation_details: {
              size: variation.size,
              color: variation.color,
              sku: variation.sku,
              price_adjustment: variation.price_adjustment,
              original_price_adjustment: variation.original_price_adjustment,
              on_sale: variation.on_sale,
              stock_at_time_of_populate: variation.stock, // Snapshot when populated
            }
          };
          updatedItems.push(updatedItem);
          hasUpdates = true;
        } else {
          updatedItems.push(item);
        }
      } else {
        updatedItems.push(item);
      }
    }

    // If we made updates, save the cart
    if (hasUpdates) {
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });
      return updatedCart;
    }

    return cart;
  },

  /**
   * Check if a product is in stock
   */
  async checkProductStock(productId: number, requestedQuantity: number) {
    try {
      // Check if the product exists and has enough stock
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images'],
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if product is published
      if (!(product as any).publishedAt) {
        throw new Error('Product is not available');
      }

      // Check if product has enough stock
      if ((product as any).stock < requestedQuantity) {
        throw new Error(`Only ${(product as any).stock} items available in stock`);
      }

      return product;
    } catch (error) {
      console.error('Error in checkProductStock:', error);
      throw error;
    }
  },

  /**
   * Add an item to the cart or update its quantity if it already exists
   */
  async addItem(userId: number, productId: number, quantity: number, variationId?: string | number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Convert variationId to string if it's a number (for schema compatibility)
      const variationIdString = variationId ? String(variationId) : null;

      // Check if the product exists and has enough stock
      const { product, variation } = await strapi.service('api::product.product').checkProductStock(
        productId,
        quantity,
        variationIdString
      );

      // Get existing items
      const existingCart: any = await strapi.entityService.findOne('api::cart.cart', cart.id, {
        populate: ['item', 'item.product'],
      });
      const existingItems = existingCart.item || [];

      // Check if the item already exists in the cart
      // For variations, we need to check both product ID and variation ID
      const existingItemIndex = existingItems.findIndex(
        (item: any) => item.product.id === productId &&
        (variationIdString ? item.variation_id === variationIdString : !item.variation_id)
      );

      let updatedItems;
      let totalRequestedQuantity = quantity;

      if (existingItemIndex >= 0) {
        // If updating an existing item, we need to check if the new quantity exceeds stock
        totalRequestedQuantity = quantity;
      }

      // Check if total quantity exceeds stock
      if (variation) {
        if (totalRequestedQuantity > variation.stock) {
          throw new Error(`Cannot set quantity to ${quantity}. Only ${variation.stock} items are available in this variation.`);
        }
      } else if (totalRequestedQuantity > product.stock) {
        throw new Error(`Cannot set quantity to ${quantity}. Only ${product.stock} items are available in stock.`);
      }

      // Update cart items
      if (existingItemIndex >= 0) {
        // Update quantity if product already in cart
        updatedItems = [...existingItems];
        const updatedItem: any = {
          ...updatedItems[existingItemIndex],
          quantity: totalRequestedQuantity,
        };

        // Update variation details if item has a variation
        if (variation) {
          updatedItem.variation_details = {
            size: variation.size,
            color: variation.color,
            sku: variation.sku,
            price_adjustment: variation.price_adjustment,
            original_price_adjustment: variation.original_price_adjustment,
            on_sale: variation.on_sale,
            stock_at_time_of_add: variation.stock, // Update stock snapshot
          };
        }

        updatedItems[existingItemIndex] = updatedItem;
      } else {
        // Add new item to cart with variation details
        const newItem: any = {
          product: productId,
          quantity,
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
            stock_at_time_of_add: variation.stock, // Snapshot of stock level when added
          };
        }

        updatedItems = [
          ...existingItems,
          newItem,
        ];
      }

      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      return updatedCart;
    } catch (error) {
      // Only log unexpected errors, not user validation errors
      if (error.message && (
          error.message.includes('stock') ||
          error.message.includes('available') ||
          error.message.includes('variation') ||
          error.message.includes('Variation ID is required') ||
          error.message.includes('not found') ||
          error.message.includes('not available') ||
          error.message.includes('must be a `string` type')
        )) {
        // These are expected user errors, just throw without logging
        throw error;
      } else {
        // Log unexpected errors
        console.error('Unexpected error in addItem:', error);
        throw error;
      }
    }
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(userId: number, productId: number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Filter out the item to remove
      const existingItems = (cart as any).item || [];

      // Check if the item exists in the cart
      const itemExists = existingItems.some((item: any) => {
        if (item.product && typeof item.product === 'object') {
          return String(item.product.id) === String(productId);
        } else {
          return String(item.product) === String(productId);
        }
      });

      if (!itemExists) {
        // If the item doesn't exist, just return the current cart
        return cart;
      }

      // Filter out the item to remove
      const updatedItems = existingItems.filter((item: any) => {
        if (item.product && typeof item.product === 'object') {
          return String(item.product.id) !== String(productId);
        } else {
          return String(item.product) !== String(productId);
        }
      });

      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      return updatedCart;
    } catch (error) {
      // Only log unexpected errors, not user validation errors
      if (error.message && error.message.includes('not found')) {
        // These are expected user errors, just throw without logging
        throw error;
      } else {
        // Log unexpected errors
        console.error('Unexpected error in removeItem:', error);
        throw error;
      }
    }
  },

  /**
   * Remove a specific item from the cart (considering variation)
   */
  async removeSpecificItem(userId: number, productId: number, variationId?: string | number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Filter out the item to remove
      const existingItems = (cart as any).item || [];

      // Convert variationId to string if provided
      const variationIdString = variationId ? String(variationId) : null;

      console.log('Removing item - Product ID:', productId, 'Variation ID:', variationIdString);
      console.log('Current cart items:', JSON.stringify(existingItems.map(item => ({
        id: item.id,
        product_id: item.product?.id || item.product,
        variation_id: item.variation_id
      })), null, 2));

      // Filter out the specific item (product + variation combination)
      const updatedItems = existingItems.filter((item: any) => {
        let productMatch = false;
        if (item.product && typeof item.product === 'object') {
          productMatch = String(item.product.id) === String(productId);
        } else {
          productMatch = String(item.product) === String(productId);
        }

        if (!productMatch) {
          return true; // Keep items that don't match the product
        }

        // If product matches, check variation
        if (variationIdString) {
          // Keep item only if variation DOESN'T match (remove if variation matches)
          const shouldKeep = String(item.variation_id || '') !== variationIdString;
          console.log(`Item ${item.id}: product match=${productMatch}, item variation=${item.variation_id}, target variation=${variationIdString}, keeping=${shouldKeep}`);
          return shouldKeep;
        } else {
          // If no variation specified, remove items with this product that have no variation
          const shouldKeep = item.variation_id !== null && item.variation_id !== undefined && item.variation_id !== '';
          console.log(`Item ${item.id}: product match=${productMatch}, has variation=${!!item.variation_id}, keeping=${shouldKeep}`);
          return shouldKeep;
        }
      });

      console.log('Items after filtering:', updatedItems.length, 'vs original:', existingItems.length);

      // Check if any item was actually removed
      if (updatedItems.length === existingItems.length) {
        if (variationIdString) {
          throw new Error(`Item not found in cart: Product ID ${productId} with variation ID ${variationIdString}`);
        } else {
          throw new Error(`Item not found in cart: Product ID ${productId}`);
        }
      }

      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      console.log('Item successfully removed from cart');
      return updatedCart;
    } catch (error) {
      // Only log unexpected errors, not user validation errors
      if (error.message && error.message.includes('not found')) {
        // These are expected user errors, just throw without logging
        throw error;
      } else {
        // Log unexpected errors
        console.error('Unexpected error in removeSpecificItem:', error);
        throw error;
      }
    }
  },

  /**
   * Update item quantity in the cart
   * This sets the quantity directly to the provided value, not adding to existing quantity
   */
  async updateItemQuantity(userId: number, productId: number, quantity: number, variationId?: string | number) {
    try {
      // Get the user's cart
      const cart = await this.getUserCart(userId);

      // Find the item to update
      const existingItems = (cart as any).item || [];

      // Convert variationId parameter to string if provided
      const requestedVariationId = variationId ? String(variationId) : null;

      // Debug log to see what's in the cart
      console.log('Cart items:', JSON.stringify(existingItems, null, 2));
      console.log('Looking for product ID:', productId, 'with variation ID:', requestedVariationId);

      const itemIndex = existingItems.findIndex((item: any) => {
        // Handle both populated and non-populated product references
        let productMatch = false;
        if (item.product && typeof item.product === 'object') {
          productMatch = String(item.product.id) === String(productId);
        } else {
          productMatch = String(item.product) === String(productId);
        }

        // If no variationId specified, find first item with this product (backward compatibility)
        if (!requestedVariationId) {
          return productMatch;
        }

        // If variationId specified, must match both product and variation
        const variationMatch = String(item.variation_id || '') === requestedVariationId;

        console.log(`Item ${item.id}: product match=${productMatch}, variation match=${variationMatch} (item variation: ${item.variation_id}, looking for: ${requestedVariationId})`);

        return productMatch && variationMatch;
      });

      if (itemIndex === -1) {
        if (requestedVariationId) {
          throw new Error(`Item not found in cart: Product ID ${productId} with variation ID ${requestedVariationId}`);
        } else {
          throw new Error(`Item not found in cart: Product ID ${productId}`);
        }
      }

      // If quantity is 0 or less, remove the item
      if (quantity <= 0) {
        // For removal, we need to remove the specific variation, not just any item with this product ID
        const cartItem = existingItems[itemIndex];
        return this.removeSpecificItem(userId, productId, cartItem.variation_id);
      }

      // Get the product to check stock (with variations)
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images', 'variations'],
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Check if product is published
      if (!(product as any).publishedAt) {
        throw new Error('Product is not available');
      }

      // Get the cart item to check if it has a variation
      const cartItem = existingItems[itemIndex];
      const cartItemVariationId = cartItem.variation_id;

      // Check stock based on whether the item has variations
      if ((product as any).has_variations && cartItemVariationId && (product as any).variations) {
        const variation = (product as any).variations.find((v: any) => String(v.id) === String(cartItemVariationId));
        if (!variation) {
          throw new Error('Product variation no longer exists');
        }
        if (variation.stock < quantity) {
          throw new Error(`Cannot update to ${quantity} items. Only ${variation.stock} items are available in this variation.`);
        }
      } else if ((product as any).has_variations && !cartItemVariationId) {
        throw new Error('Variation ID is required for this product');
      } else {
        // Regular product without variations
        if ((product as any).stock < quantity) {
          throw new Error(`Cannot update to ${quantity} items. Only ${(product as any).stock} items are available in stock.`);
        }
      }

      // Update the quantity and variation details
      const updatedItems = [...existingItems];
      const updatedItem: any = {
        ...updatedItems[itemIndex],
        quantity,
      };

      // Update variation details if item has a variation
      if ((product as any).has_variations && cartItemVariationId && (product as any).variations) {
        const variation = (product as any).variations.find((v: any) => String(v.id) === String(cartItemVariationId));
        if (variation) {
          updatedItem.variation_details = {
            size: variation.size,
            color: variation.color,
            sku: variation.sku,
            price_adjustment: variation.price_adjustment,
            original_price_adjustment: variation.original_price_adjustment,
            on_sale: variation.on_sale,
            stock_at_time_of_update: variation.stock, // Update stock snapshot
          };
        }
      }

      updatedItems[itemIndex] = updatedItem;

      // Update the cart
      const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
        data: {
          item: updatedItems,
        },
        populate: ['item', 'item.product', 'item.product.images', 'item.product.variations'],
      });

      return updatedCart;
    } catch (error) {
      // Only log unexpected errors, not user validation errors
      if (error.message && (
          error.message.includes('stock') ||
          error.message.includes('available') ||
          error.message.includes('variation') ||
          error.message.includes('not found') ||
          error.message.includes('not available') ||
          error.message.includes('Item not found')
        )) {
        // These are expected user errors, just throw without logging
        throw error;
      } else {
        // Log unexpected errors
        console.error('Unexpected error in updateItemQuantity:', error);
        throw error;
      }
    }
  },

  /**
   * Clear all items from the cart
   */
  async clearCart(userId: number) {
    // Get the user's cart
    const cart = await this.getUserCart(userId);

    // Update the cart with empty items
    const updatedCart = await strapi.entityService.update('api::cart.cart', cart.id, {
      data: {
        item: [],
      },
    });

    return updatedCart;
  },

  /**
   * Calculate cart totals
   */
  async getCartTotals(userId: number) {
    // Get the user's cart with populated items and variations
    const cart = await this.getUserCart(userId);

    const items = (cart as any).item || [];
    let subtotal = 0;

    // Calculate subtotal considering variations and discounts
    for (const item of items) {
      if (item.product && item.quantity) {
        const product = item.product as any;

        // Calculate base price considering discounts and sales
        let itemPrice = this.calculateProductPrice(product);

        // If item has a variation, get the variation price adjustment (considering variation sales)
        if (item.variation_id && product.variations) {
          const variation = product.variations.find((v: any) => String(v.id) === String(item.variation_id));
          if (variation) {
            const variationAdjustment = this.calculateVariationPriceAdjustment(variation);
            itemPrice += variationAdjustment;
          }
        }

        subtotal += itemPrice * item.quantity;
      }
    }

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      itemCount: items.length,
      totalItems: items.reduce((total, item: any) => total + (item.quantity || 0), 0),
    };
  },

  /**
   * Validate cart items before checkout
   */
  async validateCartForCheckout(userId: number) {
    // Get the user's cart with populated items
    const cart = await this.getUserCart(userId);
    const items = (cart as any).item || [];

    if (items.length === 0) {
      throw new Error('Cart is empty');
    }

    const validationResults = {
      valid: true,
      invalidItems: [],
      message: '',
    };

    // Check each item in the cart
    for (const item of items) {
      try {
        if (!item.product || !item.product.id) {
          validationResults.invalidItems.push({
            item,
            reason: 'Product information is missing',
          });
          validationResults.valid = false;
          continue;
        }

        // Check if product still exists and has enough stock (with variations)
        const product = await strapi.entityService.findOne('api::product.product', item.product.id, {
          populate: ['variations'],
        });

        if (!product) {
          validationResults.invalidItems.push({
            item,
            reason: 'Product no longer exists',
          });
          validationResults.valid = false;
          continue;
        }

        if (!(product as any).publishedAt) {
          validationResults.invalidItems.push({
            item,
            reason: 'Product is no longer available',
          });
          validationResults.valid = false;
          continue;
        }

        // Check stock based on whether the item has variations
        const variationId = item.variation_id;
        if ((product as any).has_variations && variationId && (product as any).variations) {
          const variation = (product as any).variations.find((v: any) => String(v.id) === String(variationId));
          if (!variation) {
            validationResults.invalidItems.push({
              item,
              product,
              reason: 'Product variation no longer exists',
            });
            validationResults.valid = false;
            continue;
          }
          if (variation.stock < item.quantity) {
            validationResults.invalidItems.push({
              item,
              product,
              reason: `Only ${variation.stock} items available in this variation`,
            });
            validationResults.valid = false;
            continue;
          }
        } else if ((product as any).has_variations && !variationId) {
          validationResults.invalidItems.push({
            item,
            product,
            reason: 'Variation ID is required for this product',
          });
          validationResults.valid = false;
          continue;
        } else {
          // Regular product without variations
          if ((product as any).stock < item.quantity) {
            validationResults.invalidItems.push({
              item,
              product,
              reason: `Only ${(product as any).stock} items available in stock`,
            });
            validationResults.valid = false;
            continue;
          }
        }
      } catch (error) {
        validationResults.invalidItems.push({
          item,
          reason: error.message || 'Unknown error',
        });
        validationResults.valid = false;
      }
    }

    if (!validationResults.valid) {
      validationResults.message = 'Some items in your cart are no longer available or have insufficient stock';
    }

    return validationResults;
  },

  /**
   * Calculate the effective price for a product considering discounts and sales
   */
  calculateProductPrice(product: any): number {
    const now = new Date();

    // Check if product is on sale and within sale period
    const isOnSale = product.on_sale &&
      (!product.sale_start_date || new Date(product.sale_start_date) <= now) &&
      (!product.sale_end_date || new Date(product.sale_end_date) >= now);

    if (isOnSale) {
      // Use the discounted price when on sale
      return parseFloat(product.price || 0);
    } else {
      // Use original price when not on sale, fallback to price if original_price not available
      return parseFloat(product.original_price || product.price || 0);
    }
  },

  /**
   * Calculate the effective price adjustment for a variation considering variation sales
   */
  calculateVariationPriceAdjustment(variation: any): number {
    if (variation.on_sale) {
      // Use the current (sale) price adjustment when variation is on sale
      return parseFloat(variation.price_adjustment || 0);
    } else {
      // Use original price adjustment when variation is not on sale
      return parseFloat(variation.original_price_adjustment || variation.price_adjustment || 0);
    }
  },

  /**
   * Get delivery pricing options
   */
  async getDeliveryOptions() {
    const deliveryOptions = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
      sort: { amount: 'asc' },
    });

    return deliveryOptions;
  },
}));
