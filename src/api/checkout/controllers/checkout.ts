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
    console.log(`\n🚀 ===== CHECKOUT REQUEST RECEIVED =====`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🌐 IP Address: ${ctx.request.ip}`);

    try {
      const { user } = ctx.state;
      const checkoutData: CheckoutData = ctx.request.body;

      console.log(`👤 User Authentication Check:`);
      if (!user) {
        console.error(`❌ Authentication failed: No user in request state`);
        return ctx.unauthorized('You must be logged in');
      }
      console.log(`✅ User authenticated: ID ${user.id}, Email: ${user.email || 'N/A'}`);

      console.log(`📋 Request Body:`, JSON.stringify(checkoutData, null, 2));

      // Validate required fields
      const validationErrors = [];

      if (!checkoutData.deliveryType) {
        validationErrors.push('Delivery type is required');
      }

      if (!checkoutData.paymentMethod) {
        validationErrors.push('Payment method is required');
      } else if (!['card', 'paypal', 'apple_pay', 'google_pay', 'cash_on_delivery'].includes(checkoutData.paymentMethod)) {
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
        if (!checkoutData.shippingAddress.phoneNumber) {
          validationErrors.push('Shipping address phone number is required');
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

      console.log(`✅ All validation checks passed`);
      console.log(`🔄 Calling checkout service...`);

      // Process checkout
      const result = await strapi.service('api::checkout.checkout').processCheckout(user.id, checkoutData);

      if (!result.success) {
        console.error(`❌ Checkout service returned failure:`, result.error);
        return ctx.badRequest(result.error);
      }

      console.log(`✅ Checkout service completed successfully`);
      console.log(`📤 Returning result:`, {
        success: result.success,
        orderId: result.order?.id,
        requiresPayment: result.requiresPayment,
        hasCheckoutUrl: !!result.checkoutUrl
      });

      // Send order confirmation email (don't await to avoid blocking response)
      strapi.service('api::checkout.checkout').sendOrderConfirmation(user.id, result.order)
        .catch(emailError => {
          console.error('Failed to send order confirmation email:', emailError);
        });

      console.log(`🏁 ===== CHECKOUT REQUEST COMPLETED =====\n`);
      return { data: result };
    } catch (error) {
      console.error(`\n💥 ===== CHECKOUT ERROR =====`);
      console.error(`❌ Error Type: ${error.constructor.name}`);
      console.error(`❌ Error Message: ${error.message}`);
      console.error(`❌ Error Stack:`, error.stack);

      if (error.type) {
        console.error(`❌ Stripe Error Type: ${error.type}`);
      }
      if (error.code) {
        console.error(`❌ Error Code: ${error.code}`);
      }

      console.error(`🏁 ===== CHECKOUT ERROR END =====\n`);

      // Return more specific error information
      if (error.message.includes('Stripe')) {
        ctx.throw(400, `Payment processing error: ${error.message}`);
      } else if (error.message.includes('Cart is empty')) {
        ctx.throw(400, 'Your cart is empty. Please add items before checkout.');
      } else if (error.message.includes('Delivery type')) {
        ctx.throw(400, 'Invalid delivery type selected.');
      } else {
        ctx.throw(500, error.message || 'An error occurred during checkout');
      }
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
          id: 'card',
          name: 'Card Payment',
          description: 'Pay with Visa, Mastercard, or American Express',
          icon: 'credit-card',
          requiresDetails: true,
          enabled: true,
        },
        {
          id: 'paypal',
          name: 'PayPal',
          description: 'Pay with your PayPal account',
          icon: 'paypal',
          requiresDetails: true,
          enabled: false, // Disabled for now
        },
        {
          id: 'apple_pay',
          name: 'Apple Pay',
          description: 'Quick and secure payment with Apple Pay',
          icon: 'apple',
          requiresDetails: false,
          enabled: false, // Disabled for now
        },
        {
          id: 'google_pay',
          name: 'Google Pay',
          description: 'Quick and secure payment with Google Pay',
          icon: 'google',
          requiresDetails: false,
          enabled: false, // Disabled for now
        },
        {
          id: 'cash_on_delivery',
          name: 'Cash on Delivery',
          description: 'Pay when you receive your order',
          icon: 'money-bill',
          requiresDetails: false,
          enabled: true,
        },
      ];

      // Filter to only return enabled payment methods
      const enabledMethods = paymentMethods.filter(method => method.enabled);

      return { data: enabledMethods };
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Create Stripe Payment Intent
   */
  async createPaymentIntent(ctx: any) {
    try {
      const { user } = ctx.state;
      const { amount } = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!amount || amount <= 0) {
        return ctx.badRequest('Valid amount is required');
      }

      const result = await strapi.service('api::checkout.checkout').createPaymentIntent(amount, {
        userId: user.id,
      });

      return { data: result };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      ctx.throw(500, error.message || 'An error occurred while creating payment intent');
    }
  },

  /**
   * Create payment for existing order
   */
  async payForOrder(ctx: any) {
    console.log(`\n💳 ===== PAY FOR ORDER REQUEST RECEIVED =====`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🌐 IP Address: ${ctx.request.ip}`);

    try {
      const { user } = ctx.state;
      const { customerEmail } = ctx.request.body;
      const orderIdFromParams = ctx.params.orderId;

      console.log(`👤 User Authentication Check:`);
      if (!user) {
        console.error(`❌ Authentication failed: No user in request state`);
        return ctx.unauthorized('You must be logged in to make payments');
      }
      console.log(`✅ User authenticated: ID ${user.id}, Email: ${user.email || 'N/A'}`);

      console.log(`📋 Request validation:`);
      console.log(`   Order ID from params: ${orderIdFromParams}`);
      console.log(`   Customer Email: ${customerEmail || 'Not provided'}`);

      if (!orderIdFromParams) {
        console.error(`❌ Validation failed: Order ID is required`);
        return ctx.badRequest('Order ID is required');
      }

      // Validate order ID is a number
      const orderIdNumber = parseInt(orderIdFromParams);
      if (isNaN(orderIdNumber)) {
        console.error(`❌ Validation failed: Invalid order ID format`);
        return ctx.badRequest('Invalid order ID format');
      }

      console.log(`✅ All validation checks passed`);
      console.log(`🔄 Calling payment service for order ${orderIdNumber}...`);

      // Create payment for the order
      const result = await strapi.service('api::checkout.checkout').createPaymentForOrder(
        user.id,
        orderIdNumber,
        customerEmail
      );

      console.log(`✅ Payment service completed successfully`);
      console.log(`📤 Returning result:`, {
        success: result.success,
        orderId: result.order?.id,
        hasCheckoutUrl: !!result.checkoutUrl
      });
      console.log(`🏁 ===== PAY FOR ORDER REQUEST COMPLETED =====\n`);

      return { data: result };
    } catch (error) {
      console.error(`\n💥 ===== PAY FOR ORDER ERROR =====`);
      console.error(`❌ Error Type: ${error.constructor.name}`);
      console.error(`❌ Error Message: ${error.message}`);
      console.error(`❌ Error Stack:`, error.stack);

      console.error(`🏁 ===== PAY FOR ORDER ERROR END =====\n`);

      // Return specific error messages
      if (error.message.includes('Order not found')) {
        ctx.throw(404, 'Order not found');
      } else if (error.message.includes('not authorized')) {
        ctx.throw(403, 'You are not authorized to pay for this order');
      } else if (error.message.includes('already been paid')) {
        ctx.throw(400, 'This order has already been paid');
      } else if (error.message.includes('Cannot process payment')) {
        ctx.throw(400, error.message);
      } else if (error.message.includes('Stripe')) {
        ctx.throw(400, `Payment processing error: ${error.message}`);
      } else {
        ctx.throw(500, error.message || 'An error occurred while processing payment');
      }
    }
  },
};
