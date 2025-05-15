/**
 * checkout service
 */

import { factories } from '@strapi/strapi';

// This is a process service, not tied to a content type
export default {
  /**
   * Process checkout
   */
  async processCheckout(userId: number, checkoutData: any) {
    try {
      // Get the cart service
      const cartService = strapi.service('api::cart.cart');

      // Get the order service
      const orderService = strapi.service('api::order.order');

      // Get the user's cart
      const cart = await cartService.getUserCart(userId);

      if (!cart || !cart.item || cart.item.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate cart totals
      const cartTotals = await cartService.getCartTotals(userId);

      // Validate payment information
      if (!checkoutData.paymentMethod) {
        throw new Error('Payment method is required');
      }

      // Validate shipping address
      if (!checkoutData.shippingAddress) {
        throw new Error('Shipping address is required');
      }

      // Validate delivery type
      if (!checkoutData.deliveryType) {
        throw new Error('Delivery type is required');
      }

      // Create order data
      const orderData = {
        deliveryType: checkoutData.deliveryType,
        paymentMethod: checkoutData.paymentMethod,
        shippingAddress: checkoutData.shippingAddress,
        scheduledDateTime: checkoutData.scheduledDateTime || null,
      };

      // Process payment (in a real application, you would integrate with a payment gateway)
      const paymentResult = await this.processPayment(checkoutData.paymentMethod, cartTotals.subtotal, checkoutData.paymentDetails);

      if (!paymentResult.success) {
        throw new Error(`Payment failed: ${paymentResult.message}`);
      }

      // Create the order
      const order = await orderService.createOrderFromCart(userId, orderData);

      // Return checkout result
      return {
        success: true,
        order,
        payment: paymentResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Process payment (mock implementation)
   */
  async processPayment(paymentMethod: string, amount: number, paymentDetails: any) {
    // This is a mock implementation
    // In a real application, you would integrate with a payment gateway

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demonstration purposes, we'll always return success
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount,
      paymentMethod,
      message: 'Payment processed successfully',
    };
  },

  /**
   * Validate coupon code
   */
  async validateCoupon(code: string) {
    // This is a mock implementation
    // In a real application, you would check against a database of valid coupons

    // For demonstration purposes, we'll accept a few hardcoded coupon codes
    const validCoupons = {
      'WELCOME10': { discount: 0.1, type: 'percentage' },
      'FREESHIP': { discount: 10, type: 'fixed' },
      'SUMMER25': { discount: 0.25, type: 'percentage' },
    };

    if (code in validCoupons) {
      return {
        valid: true,
        code,
        ...validCoupons[code],
      };
    }

    return {
      valid: false,
      message: 'Invalid coupon code',
    };
  },

  /**
   * Calculate order summary
   */
  async calculateOrderSummary(userId: number, couponCode?: string) {
    // Get the cart service
    const cartService = strapi.service('api::cart.cart');

    // Get the cart totals
    const cartTotals = await cartService.getCartTotals(userId);

    // Get delivery fee based on delivery type
    const deliveryType = couponCode ? 'Standard' : 'Standard';
    let deliveryFee = 0;

    const deliveryPricing = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
      filters: {
        type: deliveryType,
      },
    });

    if (deliveryPricing && deliveryPricing.length > 0) {
      deliveryFee = Number(deliveryPricing[0].amount);
    }

    // Calculate discount if coupon code is provided
    let discount = 0;
    let couponResult = null;

    if (couponCode) {
      couponResult = await this.validateCoupon(couponCode);

      if (couponResult.valid) {
        if (couponResult.type === 'percentage') {
          discount = cartTotals.subtotal * couponResult.discount;
        } else {
          discount = couponResult.discount;
        }
      }
    }

    // Calculate total
    const total = cartTotals.subtotal + deliveryFee - discount;

    return {
      subtotal: cartTotals.subtotal,
      deliveryFee,
      discount,
      total: parseFloat(total.toFixed(2)),
      itemCount: cartTotals.itemCount,
      totalItems: cartTotals.totalItems,
      coupon: couponResult,
    };
  },
};
