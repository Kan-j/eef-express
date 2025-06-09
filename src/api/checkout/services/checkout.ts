/**
 * checkout service
 */

import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2025-04-30.basil',
});

// Define payment method types
type PaymentMethod = 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'cash_on_delivery' | 'bank_transfer';

// Define payment status types
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// Define payment result interface
interface PaymentResult {
  success: boolean;
  status: PaymentStatus;
  transactionId?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  message: string;
  cardDetails?: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
  };
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
}

// Define order data interface
interface OrderData {
  deliveryType: string;
  paymentMethod: PaymentMethod;
  shippingAddress: any;
  scheduledDateTime?: any;
  paymentStatus?: PaymentStatus;
  stripeId?: string;
}

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

      console.log(`🛒 Starting checkout process for user ${userId}`);

      // Get the user's cart
      const cart = await cartService.getUserCart(userId);

      if (!cart || !cart.item || cart.item.length === 0) {
        throw new Error('Cart is empty');
      }

      console.log(`📦 Cart found with ${cart.item.length} items`);

      // Calculate cart totals
      const cartTotals = await cartService.getCartTotals(userId);
      console.log(`💰 Cart totals calculated: $${cartTotals.subtotal}`);

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

      // Calculate delivery fee
      const deliveryTypeEnum = checkoutData.deliveryType as 'Standard' | 'Express' | 'Same-Day' | 'Next-Day' | 'Scheduled';
      const deliveryPricing = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
        filters: {
          type: deliveryTypeEnum,
        },
      });

      const deliveryFee = deliveryPricing && deliveryPricing.length > 0 ? Number(deliveryPricing[0].amount) : 0;

      // Calculate tax
      const taxService = strapi.service('api::tax.tax');
      const taxCalculation = await taxService.calculateTax(cartTotals.subtotal);

      // Create order data
      const orderData: OrderData = {
        deliveryType: checkoutData.deliveryType,
        paymentMethod: checkoutData.paymentMethod,
        shippingAddress: checkoutData.shippingAddress,
        scheduledDateTime: checkoutData.scheduledDateTime || null,
      };

      // Process payment with order context
      const paymentResult = await this.processPayment(
        checkoutData.paymentMethod,
        cartTotals.subtotal,
        checkoutData.paymentDetails,
        { userId }
      );

      if (!paymentResult.success) {
        console.error(`❌ Payment failed for user ${userId}: ${paymentResult.message}`);
        throw new Error(`Payment failed: ${paymentResult.message}`);
      }

      console.log(`✅ Payment successful. Transaction ID: ${paymentResult.transactionId}`);

      // Create the order with payment status and Stripe ID if applicable
      orderData.paymentStatus = paymentResult.status;
      if (paymentResult.stripePaymentIntentId) {
        (orderData as any).stripeId = paymentResult.stripePaymentIntentId;
      }

      // Create the order
      console.log(`📝 Creating order for user ${userId}`);
      const order = await orderService.createOrderFromCart(userId, orderData);

      if (!order) {
        throw new Error('Failed to create order');
      }

      console.log(`✅ Order created successfully. Order ID: ${order.id}`);

      // Handle payment processing based on method
      if (checkoutData.paymentMethod === 'card') {
        console.log(`💳 Step 4: Creating Stripe checkout session`);

        // For card payments, create Stripe checkout session
        const stripeResult = await this.createStripeCheckoutSession(
          {
            orderId: order.id,
            userId: userId,
            deliveryType: checkoutData.deliveryType,
            deliveryFee: deliveryFee,
            tax: taxCalculation.taxAmount,
            totalAmount: cartTotals.subtotal + deliveryFee + taxCalculation.taxAmount,
            customerEmail: checkoutData.customerEmail,
          },
          cart.item
        );

        if (!stripeResult.success) {
          console.error(`❌ Stripe session creation failed: ${stripeResult.message}`);
          throw new Error(`Failed to create Stripe checkout session: ${stripeResult.message}`);
        }

        console.log(`✅ Stripe session created successfully`);

        // Create payment record with pending status
        console.log(`💾 Step 5: Creating payment record`);
        const paymentService = strapi.service('api::payment.payment');
        const paymentRecord = await paymentService.createPayment({
          amount: cartTotals.subtotal + deliveryFee + taxCalculation.taxAmount,
          status: 'pending',
          paymentMethod: 'card',
          transactionId: stripeResult.stripeSessionId || `pending_${Date.now()}`,
          paymentDetails: {
            stripeSessionId: stripeResult.stripeSessionId,
            checkoutUrl: stripeResult.checkoutUrl,
            billingAddress: checkoutData.billingAddress || checkoutData.shippingAddress
          },
          orderId: order.id,
          userId: userId
        });

        console.log(`✅ Payment record created with pending status. Payment ID: ${paymentRecord.id}`);
        console.log(`🎉 CARD CHECKOUT COMPLETE - User needs to complete payment at: ${stripeResult.checkoutUrl}`);

        // Return checkout result with Stripe checkout URL
        return {
          success: true,
          order,
          payment: {
            ...paymentResult,
            ...stripeResult,
          },
          requiresPayment: true,
          checkoutUrl: stripeResult.checkoutUrl,
        };
      } else {
        // For cash on delivery, create payment record and clear cart
        const paymentService = strapi.service('api::payment.payment');

        const paymentRecord = await paymentService.createPayment({
          amount: cartTotals.subtotal,
          status: paymentResult.status,
          paymentMethod: checkoutData.paymentMethod as any,
          transactionId: paymentResult.transactionId || `cod_${Date.now()}`,
          paymentDetails: {
            billingAddress: checkoutData.billingAddress || checkoutData.shippingAddress
          },
          orderId: order.id,
          userId: userId
        });

        console.log(`✅ Payment record created. Payment ID: ${paymentRecord.id}`);

        // Clear the cart for cash on delivery orders
        console.log(`🧹 Clearing cart for user ${userId}`);
        await cartService.clearCart(userId);
        console.log(`🎉 CHECKOUT COMPLETE! Cart cleared for user ${userId}. Order ID: ${order.id}, Payment ID: ${paymentRecord.id}`);

        // Return checkout result
        return {
          success: true,
          order,
          payment: paymentResult,
          requiresPayment: false,
        };
      }
    } catch (error) {
      console.error(`💥 CHECKOUT FAILED for user ${userId}:`, error.message);
      console.error(`💥 Error stack:`, error.stack);
      console.error(`💥 Error details:`, error);
      return {
        success: false,
        error: error.message,
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };
    }
  },

  /**
   * Process payment with Stripe integration
   */
  async processPayment(paymentMethod: PaymentMethod, amount: number, paymentDetails: any, orderData?: any): Promise<PaymentResult> {
    try {
      // Handle cash on delivery
      if (paymentMethod === 'cash_on_delivery') {
        return {
          success: true,
          status: 'pending' as PaymentStatus,
          transactionId: `cod_${Date.now()}`,
          amount,
          paymentMethod,
          message: 'Cash on delivery order created successfully',
        };
      }

      // Handle card payments with Stripe Checkout
      if (paymentMethod === 'card') {
        // For card payments, we'll create the checkout session after order creation
        return {
          success: true,
          status: 'pending' as PaymentStatus,
          transactionId: `pending_${Date.now()}`,
          amount,
          paymentMethod: 'card',
          message: 'Order created, payment pending',
        };
      }

      // Handle other payment methods (PayPal, Apple Pay, etc.)
      // For now, we'll simulate these
      if (paymentMethod === 'paypal') {
        if (!paymentDetails.email) {
          return {
            success: false,
            status: 'failed' as PaymentStatus,
            message: 'PayPal email is required',
          };
        }

        // Simulate PayPal processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
          success: true,
          status: 'completed' as PaymentStatus,
          transactionId: `pp_${Date.now()}`,
          amount,
          paymentMethod,
          message: 'PayPal payment processed successfully',
        };
      }

      // Default case for other payment methods
      return {
        success: false,
        status: 'failed' as PaymentStatus,
        message: 'Payment method not supported',
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        status: 'failed' as PaymentStatus,
        message: error.message || 'Payment processing failed',
      };
    }
  },

  /**
   * Create Stripe Checkout Session (Based on Official Stripe Docs)
   */
  async createStripeCheckoutSession(orderData: any, cartItems: any[]): Promise<PaymentResult> {
    try {
      console.log(`💳 Creating Stripe checkout session for order ${orderData.orderId}`);
      console.log(`💰 Total amount: $${orderData.totalAmount}`);
      console.log(`📦 Cart items:`, cartItems.length);

      // Validate Stripe configuration
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }

      if (!process.env.SUCCESS_URL || !process.env.CANCEL_URL) {
        throw new Error('SUCCESS_URL and CANCEL_URL must be configured');
      }

      // Prepare line items for Stripe with variation support
      const lineItems = cartItems.map((item: any, index: number) => {
        // Debug the item structure
        console.log(`   Item ${index + 1} structure:`, JSON.stringify(item, null, 2));

        // Extract product data with fallbacks
        const product = item.product || {};
        let productName = product.title || product.name || `Product ${product.id || index + 1}`;

        // Calculate product price considering discounts
        const cartService = strapi.service('api::cart.cart');
        let productPrice = cartService.calculateProductPrice(product);
        const productDescription = product.description;

        // Handle variation details and pricing (considering variation sales)
        let variationInfo = '';
        if (item.variation_id && item.variation_details) {
          const variation = item.variation_details;

          // Add variation details to product name
          const variationParts = [];
          if (variation.size) variationParts.push(variation.size);
          if (variation.color) variationParts.push(variation.color);
          if (variationParts.length > 0) {
            variationInfo = ` (${variationParts.join(', ')})`;
            productName += variationInfo;
          }

          // Add variation price adjustment (considering variation sales)
          const cartService = strapi.service('api::cart.cart');
          const adjustment = cartService.calculateVariationPriceAdjustment(variation);
          productPrice += adjustment;

          console.log(`   Variation adjustment: +$${adjustment} for ${variationParts.join(', ')} ${variation.on_sale ? '(on sale)' : ''}`);
        }

        console.log(`   Adding item: ${productName} x${item.quantity} @ $${productPrice.toFixed(2)}`);

        // Validate required fields
        if (!productName) {
          throw new Error(`Product name is missing for item ${index + 1}`);
        }

        if (!productPrice || productPrice <= 0) {
          throw new Error(`Invalid product price for item: ${productName}`);
        }

        // Prepare description - only include if not empty
        let description = '';
        if (item.variation_details && item.variation_details.sku) {
          // For items with variations, include SKU
          description = productDescription
            ? `${productDescription} (SKU: ${item.variation_details.sku})`
            : `SKU: ${item.variation_details.sku}`;
        } else if (productDescription && productDescription.trim()) {
          // For items without variations, use product description if available
          description = productDescription.trim();
        }

        const productData: any = {
          name: productName,
          // Only include images if they exist and have valid URLs
          ...(product.images && product.images.length > 0 && product.images[0]?.url && {
            images: [product.images[0].url.startsWith('http')
              ? product.images[0].url
              : `${process.env.FRONTEND_URL || 'http://localhost:1337'}${product.images[0].url}`]
          })
        };

        // Only add description if it's not empty
        if (description) {
          productData.description = description;
        }

        return {
          price_data: {
            currency: 'aed', // UAE Dirham
            product_data: productData,
            unit_amount: Math.round(productPrice * 100), // Convert to fils (cents) - includes variation adjustment
          },
          quantity: item.quantity || 1,
        };
      });

      // Add delivery fee as a separate line item
      if (orderData.deliveryFee && orderData.deliveryFee > 0) {
        console.log(`   Adding delivery: ${orderData.deliveryType} @ $${orderData.deliveryFee}`);
        lineItems.push({
          price_data: {
            currency: 'aed',
            product_data: {
              name: `${orderData.deliveryType} Delivery`,
              description: 'Delivery service',
              images: [], // Empty array for service items
            },
            unit_amount: Math.round(orderData.deliveryFee * 100),
          },
          quantity: 1,
        });
      }

      // Add tax as a separate line item if applicable
      if (orderData.tax && orderData.tax > 0) {
        console.log(`   Adding tax: $${orderData.tax}`);
        lineItems.push({
          price_data: {
            currency: 'aed',
            product_data: {
              name: 'VAT',
              description: 'Value Added Tax',
              images: [], // Empty array for service items
            },
            unit_amount: Math.round(orderData.tax * 100),
          },
          quantity: 1,
        });
      }

      console.log(`📋 Total line items: ${lineItems.length}`);

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderData.orderId}`,
        cancel_url: `${process.env.CANCEL_URL}?order_id=${orderData.orderId}`,
        metadata: {
          order_id: orderData.orderId.toString(),
          user_id: orderData.userId.toString(),
        },
        customer_email: orderData.customerEmail || undefined,
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['AE'], // UAE only
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes from now
      });

      console.log(`✅ Stripe session created successfully:`);
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Checkout URL: ${session.url}`);
      console.log(`   Expires at: ${new Date(session.expires_at * 1000).toISOString()}`);

      return {
        success: true,
        status: 'pending' as PaymentStatus,
        transactionId: session.id,
        amount: orderData.totalAmount,
        paymentMethod: 'card',
        message: 'Stripe checkout session created successfully',
        stripeSessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch (error) {
      console.error(`❌ Stripe checkout session creation failed:`, error);
      console.error(`Error details:`, {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack
      });

      return {
        success: false,
        status: 'failed' as PaymentStatus,
        message: `Stripe error: ${error.message}`,
      };
    }
  },

  /**
   * Create Stripe Payment Intent (for frontend to confirm)
   */
  async createPaymentIntent(amount: number, orderData?: any) {
    try {
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'aed',
        metadata: {
          orderId: orderData?.orderId || '',
          userId: orderData?.userId || '',
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },



  /**
   * Calculate order summary with enhanced implementation
   */
  async calculateOrderSummary(userId: number, options: { deliveryType?: string } = {}) {
    // Get the cart service
    const cartService = strapi.service('api::cart.cart');

    // Get the user's cart with items
    const cart = await cartService.getUserCart(userId);

    // Get the cart totals
    const cartTotals = await cartService.getCartTotals(userId);

    // Get delivery fee based on delivery type
    const deliveryType = options.deliveryType || 'Standard';
    let deliveryFee = 0;

    // Cast the delivery type to the expected enum type
    const deliveryTypeEnum = deliveryType as 'Standard' | 'Express' | 'Same-Day' | 'Next-Day' | 'Scheduled';

    const deliveryPricing = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
      filters: {
        type: deliveryTypeEnum,
      },
    });

    if (deliveryPricing && deliveryPricing.length > 0) {
      deliveryFee = Number(deliveryPricing[0].amount);
    }

    // Calculate tax using the tax service
    const taxService = strapi.service('api::tax.tax');

    // Calculate tax for the cart subtotal
    const taxCalculation = await taxService.calculateTax(cartTotals.subtotal);

    // Calculate total
    const total = cartTotals.subtotal + deliveryFee + taxCalculation.taxAmount;

    // Get all available delivery options
    const deliveryOptions = await cartService.getDeliveryOptions();

    // Format cart items for the response with variation details and proper pricing
    const items = cart && cart.item ? cart.item.map((item: any) => {
      // Calculate item price including discounts and variation adjustments
      const cartService = strapi.service('api::cart.cart');
      let itemPrice = cartService.calculateProductPrice(item.product);

      // Calculate detailed price breakdown
      const originalPrice = parseFloat(item.product.original_price || item.product.price || 0);
      const isOnSale = item.product.on_sale || false;
      const discountPercentage = item.product.discount_percentage || null;

      let calculatedDiscountedPrice = parseFloat(item.product.price || 0);
      let discountAmount = 0;

      // If discount percentage is set and product is on sale, calculate the discounted price
      if (isOnSale && discountPercentage && discountPercentage > 0) {
        discountAmount = (originalPrice * parseFloat(discountPercentage)) / 100;
        calculatedDiscountedPrice = Math.max(0, originalPrice - discountAmount);
      }

      let priceBreakdown: any = {
        originalPrice,
        discountedPrice: calculatedDiscountedPrice,
        effectivePrice: itemPrice,
        discountPercentage,
        discountAmount,
        calculatedFromPercentage: isOnSale && discountPercentage && discountPercentage > 0,
        variationAdjustment: 0,
        finalPrice: itemPrice,
        isOnSale,
      };

      // Add variation price adjustment if item has a variation (considering variation sales)
      if (item.variation_id && item.variation_details) {
        const cartService = strapi.service('api::cart.cart');
        const variationAdjustment = cartService.calculateVariationPriceAdjustment(item.variation_details);

        // Enhanced variation breakdown
        priceBreakdown.variationOriginalAdjustment = parseFloat(item.variation_details.original_price_adjustment || item.variation_details.price_adjustment || 0);
        priceBreakdown.variationCurrentAdjustment = parseFloat(item.variation_details.price_adjustment || 0);
        priceBreakdown.variationEffectiveAdjustment = variationAdjustment;
        priceBreakdown.variationOnSale = item.variation_details.on_sale || false;
        priceBreakdown.variationAdjustment = variationAdjustment; // For backward compatibility

        priceBreakdown.finalPrice = itemPrice + variationAdjustment;
        itemPrice = priceBreakdown.finalPrice;
      }

      // Calculate item subtotal
      const itemSubtotal = parseFloat((itemPrice * item.quantity).toFixed(2));

      return {
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          title: item.product.title,
          price: item.product.price,
          images: item.product.images,
          slug: item.product.slug,
        },
        quantity: item.quantity,
        variation_id: item.variation_id,
        variation_details: item.variation_details ? {
          size: item.variation_details.size,
          color: item.variation_details.color,
          sku: item.variation_details.sku,
          price_adjustment: item.variation_details.price_adjustment,
          original_price_adjustment: item.variation_details.original_price_adjustment,
          on_sale: item.variation_details.on_sale,
        } : null,
        priceBreakdown,
        unitPrice: itemPrice,
        subtotal: itemSubtotal
      };
    }) : [];

    // Calculate detailed pricing breakdown
    const pricingBreakdown = {
      itemsSubtotal: cartTotals.subtotal,
      deliveryFee,
      taxAmount: taxCalculation.taxAmount,
      totalAmount: parseFloat(total.toFixed(2)),

      // Detailed breakdown for transparency
      breakdown: {
        originalProductsTotal: items.reduce((sum, item) => sum + (item.priceBreakdown.originalPrice * item.quantity), 0),
        discountsTotal: items.reduce((sum, item) => {
          const originalTotal = item.priceBreakdown.originalPrice * item.quantity;
          const effectiveTotal = item.priceBreakdown.effectivePrice * item.quantity;
          return sum + (originalTotal - effectiveTotal);
        }, 0),
        effectiveProductsTotal: items.reduce((sum, item) => sum + (item.priceBreakdown.effectivePrice * item.quantity), 0),
        variationAdjustmentsTotal: items.reduce((sum, item) => sum + (item.priceBreakdown.variationAdjustment * item.quantity), 0),
        subtotalWithVariations: cartTotals.subtotal,
        delivery: deliveryFee,
        tax: taxCalculation.taxAmount,
        grandTotal: parseFloat(total.toFixed(2))
      }
    };

    return {
      subtotal: cartTotals.subtotal,
      deliveryFee,
      tax: taxCalculation.taxAmount,
      taxDetails: taxCalculation.taxDetails, // Include detailed tax breakdown
      total: parseFloat(total.toFixed(2)),
      itemCount: cartTotals.itemCount,
      totalItems: cartTotals.totalItems,
      selectedDeliveryType: deliveryType,
      deliveryOptions,
      items, // Include cart items with variation details
      pricingBreakdown, // Detailed pricing explanation

      // Summary explanation for frontend display
      pricingExplanation: {
        message: "Subtotal includes product prices (with discounts applied), plus any variation price adjustments",
        calculation: `Original: $${pricingBreakdown.breakdown.originalProductsTotal.toFixed(2)} - Discounts: $${pricingBreakdown.breakdown.discountsTotal.toFixed(2)} + Variations: $${pricingBreakdown.breakdown.variationAdjustmentsTotal.toFixed(2)} = Subtotal: $${cartTotals.subtotal.toFixed(2)}`,
        variationsIncluded: items.filter(item => item.variation_details).length > 0,
        discountsApplied: pricingBreakdown.breakdown.discountsTotal > 0,
        totalSavings: pricingBreakdown.breakdown.discountsTotal
      }
    };
  },

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(userId: number, order: any) {
    try {
      // Get user details
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);

      if (!user || !user.email) {
        console.error('Cannot send order confirmation: User email not found');
        return false;
      }

      // In a real application, you would use an email service
      // For now, we'll just log the email content
      console.log(`Sending order confirmation email to ${user.email}`);
      console.log(`Subject: Your Order #${order.id} has been confirmed`);
      console.log(`Body: Thank you for your order. Your order #${order.id} has been confirmed and is being processed.`);

      // Create a notification for the user
      await strapi.entityService.create('api::notification.notification', {
        data: {
          users_permissions_user: userId,
          title: 'Order Confirmed',
          message: `Your order #${order.id} has been confirmed and is being processed.`,
          read: false,
          publishedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      return false;
    }
  },

  /**
   * Create payment for existing order
   */
  async createPaymentForOrder(userId: number, orderId: number, customerEmail?: string) {
    console.log(`\n💳 ===== CREATING PAYMENT FOR EXISTING ORDER =====`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`📋 Order ID: ${orderId}`);

    try {
      // Get the order with all details
      const order = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: [
          'products',
          'products.product',
          'products.product.images',
          'users_permissions_user'
        ],
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Verify the order belongs to the user
      if ((order as any).users_permissions_user?.id !== userId) {
        throw new Error('You are not authorized to pay for this order');
      }

      // Check if order is eligible for payment
      if ((order as any).paymentStatus === 'completed') {
        throw new Error('This order has already been paid');
      }

      if ((order as any).paymentStatus === 'failed') {
        console.log(`⚠️ Order ${orderId} has failed payment status, allowing retry`);
      }

      if ((order as any).paymentStatus !== 'pending' && (order as any).paymentStatus !== 'failed') {
        throw new Error(`Cannot process payment for order with status: ${(order as any).paymentStatus}`);
      }

      console.log(`✅ Order validation passed:`);
      console.log(`   Order ID: ${order.id}`);
      console.log(`   Payment Status: ${(order as any).paymentStatus}`);
      console.log(`   Total Amount: $${(order as any).totalAmount}`);
      console.log(`   Delivery Type: ${(order as any).deliveryType}`);
      console.log(`   Products: ${(order as any).products?.length || 0} items`);

      // Prepare order data for Stripe session
      const orderData = {
        orderId: order.id,
        userId: userId,
        deliveryType: (order as any).deliveryType,
        deliveryFee: (order as any).deliveryFee || 0,
        tax: (order as any).totalAmount - (order as any).subTotal - ((order as any).deliveryFee || 0),
        totalAmount: (order as any).totalAmount,
        customerEmail: customerEmail || (order as any).users_permissions_user?.email,
      };

      // Convert order products to cart-like items for Stripe
      const cartItems = ((order as any).products || []).map((orderProduct: any) => ({
        product: orderProduct.product,
        quantity: orderProduct.quantity,
      }));

      console.log(`📦 Converted ${cartItems.length} order items to cart format`);

      // Create Stripe checkout session
      const stripeResult = await this.createStripeCheckoutSession(orderData, cartItems);

      if (!stripeResult.success) {
        throw new Error(`Failed to create payment session: ${stripeResult.message}`);
      }

      console.log(`✅ Stripe checkout session created successfully`);
      console.log(`   Session ID: ${stripeResult.stripeSessionId}`);
      console.log(`   Checkout URL: ${stripeResult.checkoutUrl}`);

      // Update existing payment record or create new one
      const paymentService = strapi.service('api::payment.payment');

      // Check if there's already a payment record for this order
      const existingPayments = await strapi.entityService.findMany('api::payment.payment', {
        filters: {
          order: { id: orderId },
        },
      });

      let paymentRecord;
      if (existingPayments && existingPayments.length > 0) {
        // Update existing payment record
        console.log(`🔄 Updating existing payment record`);
        paymentRecord = await strapi.entityService.update('api::payment.payment', existingPayments[0].id, {
          data: {
            status: 'pending',
            transactionId: stripeResult.stripeSessionId,
            paymentDetails: {
              stripeSessionId: stripeResult.stripeSessionId,
              checkoutUrl: stripeResult.checkoutUrl,
              retryAttempt: true,
              retryTimestamp: new Date().toISOString(),
            },
            publishedAt: new Date(),
          },
        });
      } else {
        // Create new payment record
        console.log(`🆕 Creating new payment record`);
        paymentRecord = await paymentService.createPayment({
          amount: (order as any).totalAmount,
          status: 'pending',
          paymentMethod: 'card',
          transactionId: stripeResult.stripeSessionId,
          paymentDetails: {
            stripeSessionId: stripeResult.stripeSessionId,
            checkoutUrl: stripeResult.checkoutUrl,
            retryPayment: true,
          },
          orderId: order.id,
          userId: userId
        });
      }

      console.log(`✅ Payment record updated/created. Payment ID: ${paymentRecord.id}`);
      console.log(`🎉 PAYMENT SESSION READY - User can complete payment at: ${stripeResult.checkoutUrl}`);
      console.log(`🏁 ===== PAYMENT FOR ORDER CREATION COMPLETED =====\n`);

      return {
        success: true,
        order: {
          id: order.id,
          totalAmount: (order as any).totalAmount,
          deliveryType: (order as any).deliveryType,
          paymentStatus: (order as any).paymentStatus,
        },
        payment: {
          ...stripeResult,
          paymentId: paymentRecord.id,
        },
        checkoutUrl: stripeResult.checkoutUrl,
        message: 'Payment session created successfully. Please complete payment to confirm your order.',
      };
    } catch (error) {
      console.error(`❌ PAYMENT FOR ORDER FAILED:`, error.message);
      console.error(`🏁 ===== PAYMENT FOR ORDER ERROR END =====\n`);
      throw error;
    }
  },
};
