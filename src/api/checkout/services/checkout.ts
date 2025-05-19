/**
 * checkout service
 */

// Define payment method types
type PaymentMethod = 'credit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'cash_on_delivery' | 'bank_transfer';

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
}

// Define order data interface
interface OrderData {
  deliveryType: string;
  paymentMethod: PaymentMethod;
  shippingAddress: any;
  scheduledDateTime?: any;
  paymentStatus?: PaymentStatus;
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
      const orderData: OrderData = {
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

      // Create the order with payment status
      orderData.paymentStatus = paymentResult.status;
      const order = await orderService.createOrderFromCart(userId, orderData);

      // Create a payment record
      if (order) {
        const paymentService = strapi.service('api::payment.payment');

        // Prepare payment details
        const paymentDetails: any = {
          billingAddress: checkoutData.billingAddress || checkoutData.shippingAddress
        };

        // Add card details if available
        if (paymentResult.cardDetails) {
          Object.assign(paymentDetails, paymentResult.cardDetails);
        }

        await paymentService.createPayment({
          amount: cartTotals.subtotal,
          status: paymentResult.status,
          paymentMethod: checkoutData.paymentMethod as any, // Type assertion
          transactionId: paymentResult.transactionId || `txn_${Date.now()}`,
          paymentDetails,
          orderId: order.id,
          userId: userId
        });

        // Clear the cart after successful checkout
        await cartService.clearCart(userId);
        console.log(`Cart cleared for user ${userId} after successful checkout`);
      }

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
   * Process payment with enhanced implementation
   */
  async processPayment(paymentMethod: PaymentMethod, amount: number, paymentDetails: any): Promise<PaymentResult> {
    // This is still a mock implementation but with more realistic behavior
    // In a real application, you would integrate with a payment gateway like Stripe, PayPal, etc.

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate payment details based on method
    if (paymentMethod === 'credit_card') {
      if (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
        return {
          success: false,
          status: 'failed' as PaymentStatus,
          message: 'Invalid card details',
        };
      }

      // Basic card validation (in a real app, you'd use a library for this)
      if (paymentDetails.cardNumber.replace(/\s/g, '').length !== 16) {
        return {
          success: false,
          status: 'failed' as PaymentStatus,
          message: 'Invalid card number',
        };
      }
    } else if (paymentMethod === 'paypal') {
      if (!paymentDetails.email) {
        return {
          success: false,
          status: 'failed' as PaymentStatus,
          message: 'PayPal email is required',
        };
      }
    }

    // For testing purposes, allow simulating payment failures
    if (paymentDetails.simulateFailure) {
      return {
        success: false,
        status: 'failed' as PaymentStatus,
        message: 'Payment failed (simulated)',
      };
    }

    // Create a payment record in the database (if you have a payment model)
    // This would be useful for tracking payment history
    // const payment = await strapi.entityService.create('api::payment.payment', {
    //   data: {
    //     amount,
    //     method: paymentMethod,
    //     status: 'completed',
    //     transactionId: `txn_${Date.now()}`,
    //     details: paymentDetails,
    //     publishedAt: new Date(),
    //   },
    // });

    // Return success response
    return {
      success: true,
      status: 'completed' as PaymentStatus,
      transactionId: `txn_${Date.now()}`,
      amount,
      paymentMethod,
      message: 'Payment processed successfully',
      // Include masked card details for credit card payments
      ...(paymentMethod === 'credit_card' && {
        cardDetails: {
          lastFourDigits: paymentDetails.cardNumber.slice(-4),
          expiryMonth: paymentDetails.expiryDate.split('/')[0],
          expiryYear: paymentDetails.expiryDate.split('/')[1],
          cardholderName: paymentDetails.cardholderName,
        },
      }),
    };
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

    // Calculate tax (if applicable)
    const taxRate = 0.05; // 5% tax rate (example)
    const taxableAmount = cartTotals.subtotal;
    const tax = taxableAmount * taxRate;

    // Calculate total
    const total = cartTotals.subtotal + deliveryFee + tax;

    // Get all available delivery options
    const deliveryOptions = await cartService.getDeliveryOptions();

    // Format cart items for the response
    const items = cart && cart.item ? cart.item.map((item: any) => ({
      id: item.id,
      product: {
        id: item.product.id,
        title: item.product.title,
        price: item.product.price,
        images: item.product.images,
        slug: item.product.slug,
      },
      quantity: item.quantity,
      subtotal: parseFloat((item.product.price * item.quantity).toFixed(2))
    })) : [];

    return {
      subtotal: cartTotals.subtotal,
      deliveryFee,
      tax: parseFloat(tax.toFixed(2)),
      taxRate: taxRate * 100, // Convert to percentage
      total: parseFloat(total.toFixed(2)),
      itemCount: cartTotals.itemCount,
      totalItems: cartTotals.totalItems,
      selectedDeliveryType: deliveryType,
      deliveryOptions,
      items, // Include cart items in the response
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
};
