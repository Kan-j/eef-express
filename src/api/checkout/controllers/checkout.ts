/**
 * checkout controller
 */

// No need to import factories since this is not a core controller

// Define types for TypeScript
type CheckoutData = {
  deliveryType: string;
  paymentMethod: string;
  paymentDetails: any;
  shippingAddress: any;
  scheduledDateTime?: Date;
  couponCode?: string;
};

// This is a process controller, not tied to a content type
export default {
  /**
   * Process checkout with enhanced validation and processing
   */
  async checkout(ctx: any) {
    try {
      const { user } = ctx.state;
      const checkoutData: CheckoutData = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // Validate required fields
      const validationErrors = [];

      if (!checkoutData.deliveryType) {
        validationErrors.push('Delivery type is required');
      }

      if (!checkoutData.paymentMethod) {
        validationErrors.push('Payment method is required');
      } else if (!['credit_card', 'paypal', 'apple_pay', 'google_pay', 'cash_on_delivery'].includes(checkoutData.paymentMethod)) {
        validationErrors.push('Invalid payment method');
      }

      if (!checkoutData.shippingAddress) {
        validationErrors.push('Shipping address is required');
      } else {
        // Validate shipping address fields
        if (!checkoutData.shippingAddress.name) {
          validationErrors.push('Shipping address name is required');
        }
        if (!checkoutData.shippingAddress.addressLine1) {
          validationErrors.push('Shipping address line 1 is required');
        }
        if (!checkoutData.shippingAddress.emirate) {
          validationErrors.push('Shipping address emirate is required');
        }
      }

      // If scheduled delivery, validate date
      if (checkoutData.deliveryType === 'Scheduled' && !checkoutData.scheduledDateTime) {
        validationErrors.push('Scheduled delivery requires a date and time');
      }

      // If there are validation errors, return them
      if (validationErrors.length > 0) {
        return ctx.badRequest({
          message: 'Validation failed',
          errors: validationErrors,
        });
      }

      // Remove couponCode from checkoutData if it exists
      if (checkoutData.couponCode) {
        delete checkoutData.couponCode;
      }

      // Process checkout
      const result = await strapi.service('api::checkout.checkout').processCheckout(user.id, checkoutData);

      if (!result.success) {
        return ctx.badRequest(result.error);
      }

      // Send order confirmation email
      await strapi.service('api::checkout.checkout').sendOrderConfirmation(user.id, result.order);

      return { data: result };
    } catch (error) {
      console.error('Checkout error:', error);
      ctx.throw(500, error.message || 'An error occurred during checkout');
    }
  },



  /**
   * Get order summary with enhanced options
   */
  async orderSummary(ctx: any) {
    try {
      const { user } = ctx.state;
      const { deliveryType } = ctx.query as { deliveryType?: string };

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const summary = await strapi.service('api::checkout.checkout').calculateOrderSummary(user.id, {
        deliveryType,
      });

      return { data: summary };
    } catch (error) {
      console.error('Order summary error:', error);
      ctx.throw(500, error.message || 'An error occurred while calculating order summary');
    }
  },

  /**
   * Get available payment methods
   */
  async paymentMethods(ctx: any) {
    try {
      // In a real application, this might come from a database or configuration
      const paymentMethods = [
        {
          id: 'credit_card',
          name: 'Credit Card',
          description: 'Pay with Visa, Mastercard, or American Express',
          icon: 'credit-card',
          requiresDetails: true,
        },
        {
          id: 'paypal',
          name: 'PayPal',
          description: 'Pay with your PayPal account',
          icon: 'paypal',
          requiresDetails: true,
        },
        {
          id: 'apple_pay',
          name: 'Apple Pay',
          description: 'Quick and secure payment with Apple Pay',
          icon: 'apple',
          requiresDetails: false,
        },
        {
          id: 'google_pay',
          name: 'Google Pay',
          description: 'Quick and secure payment with Google Pay',
          icon: 'google',
          requiresDetails: false,
        },
        {
          id: 'cash_on_delivery',
          name: 'Cash on Delivery',
          description: 'Pay when you receive your order',
          icon: 'money-bill',
          requiresDetails: false,
        },
      ];

      return { data: paymentMethods };
    } catch (error) {
      ctx.throw(500, error);
    }
  },
};
