/**
 * stripe-webhook controller
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2025-04-30.basil',
});

export default {
  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(ctx: any) {
    console.log(`\n🔔 ===== STRIPE WEBHOOK RECEIVED =====`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🌐 IP Address: ${ctx.request.ip}`);

    const sig = ctx.request.headers['stripe-signature'];
    let raw: any;
    let event: any;

    // Since we disabled body parsing, we need to read the raw body manually
    if (!ctx.request.body) {
      console.log(`📜 Reading raw body from request stream...`);

      // Read raw body from request stream
      const chunks: Buffer[] = [];

      try {
        await new Promise((resolve, reject) => {
          ctx.req.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          ctx.req.on('end', () => {
            raw = Buffer.concat(chunks);
            resolve(true);
          });

          ctx.req.on('error', (error: any) => {
            reject(error);
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 10000);
        });
      } catch (error) {
        console.error('❌ Error reading request body:', error);
        console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
        return ctx.badRequest('Error reading request body');
      }
    } else {
      // Fallback to existing methods
      raw = ctx.request.body?._raw || ctx.request.rawBody || ctx.request.body;
    }

    console.log(`🔐 Signature verification details:`);
    console.log(`   Signature header: ${sig ? 'Present' : 'Missing'}`);
    console.log(`   Raw body type: ${typeof raw}`);
    console.log(`   Raw body length: ${raw ? raw.length : 'N/A'}`);
    console.log(`   Raw body is Buffer: ${Buffer.isBuffer(raw)}`);
    console.log(`   Webhook secret configured: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Yes' : 'No'}`);

    if (!sig) {
      console.error('❌ Missing Stripe signature header');
      console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
      return ctx.badRequest('Missing Stripe signature');
    }

    if (!raw) {
      console.error('❌ Missing raw request body');
      console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
      return ctx.badRequest('Missing request body');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
      console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
      return ctx.badRequest('Webhook secret not configured');
    }

    try {
      // Verify webhook signature using raw body
      event = stripe.webhooks.constructEvent(
        raw,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log(`✅ Webhook signature verified successfully`);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      console.error(`🔍 Debug info:`, {
        signatureHeader: sig,
        rawBodyType: typeof raw,
        rawBodyLength: raw ? raw.length : 'N/A',
        rawBodyIsBuffer: Buffer.isBuffer(raw),
        webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.length : 'N/A'
      });
      console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
      return ctx.badRequest('Invalid signature');
    }

    console.log(`🔔 Event Type: ${event.type}`);
    console.log(`🆔 Event ID: ${event.id}`);

    // Handle checkout session completed event
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutSessionCompleted(event.data.object);
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log(`🏁 ===== STRIPE WEBHOOK COMPLETED =====\n`);
    return ctx.send({ received: true });
  },

  /**
   * Handle successful checkout session completion
   */
  async handleCheckoutSessionCompleted(session: any) {
    console.log(`✅ Processing checkout session completed: ${session.id}`);

    const orderId = session.metadata?.order_id;

    if (!orderId) {
      console.error('❌ Missing order_id in session metadata');
      return;
    }

    console.log(`📋 Processing order ID: ${orderId}`);

    try {
      // 🔍 Find order with payment relation
      const order = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: ['payment'],
      }) as any;

      if (!order) {
        console.error(`❌ Order not found for ID ${orderId}`);
        return;
      }

      console.log(`📦 Order found:`, {
        id: order.id,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        hasPayment: !!order.payment
      });

      // ✅ Skip if already marked as completed
      if (order.paymentStatus === 'completed') {
        console.log(`ℹ️ Order ${orderId} already completed`);
        return;
      }

      // 🔄 Update existing payment record
      if (order.payment) {
        console.log(`🔄 Updating payment record ID: ${order.payment.id}`);

        await strapi.entityService.update('api::payment.payment', order.payment.id, {
          data: {
            status: 'completed',
            transactionId: session.id,
            paymentDetails: {
              stripeSessionId: session.id,
              stripeCustomerId: session.customer,
              stripePaymentIntentId: session.payment_intent,
              customerEmail: session.customer_details?.email || session.customer_email,
              paymentStatus: session.payment_status,
              amountTotal: session.amount_total,
              currency: session.currency,
              completedAt: new Date().toISOString(),
            },
            publishedAt: new Date(),
          },
        });

        console.log(`✅ Payment ${order.payment.id} updated successfully`);
      } else {
        console.warn(`⚠️ Order ${orderId} has no associated payment record`);

        // Create a new payment record if none exists
        const paymentService = strapi.service('api::payment.payment');
        await paymentService.createPayment({
          amount: session.amount_total / 100, // Convert from cents
          status: 'completed',
          paymentMethod: 'card',
          transactionId: session.id,
          paymentDetails: {
            stripeSessionId: session.id,
            stripeCustomerId: session.customer,
            stripePaymentIntentId: session.payment_intent,
            customerEmail: session.customer_details?.email || session.customer_email,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            completedAt: new Date().toISOString(),
          },
          orderId: order.id,
          userId: order.users_permissions_user?.id || session.metadata?.user_id,
        });

        console.log(`🆕 New payment record created for order ${orderId}`);
      }

      // ✅ Mark order as paid
      await strapi.entityService.update('api::order.order', orderId, {
        data: {
          paymentStatus: 'completed',
          publishedAt: new Date(),
        },
      });

      console.log(`✅ Order ${orderId} marked as completed`);

      // Clear the cart now that payment is completed
      const userId = order.users_permissions_user?.id || session.metadata?.user_id;
      if (userId) {
        console.log(`🧹 Clearing cart for user ${userId}`);
        const cartService = strapi.service('api::cart.cart');
        await cartService.clearCart(parseInt(userId));
        console.log(`✅ Cart cleared for user ${userId}`);
      } else {
        console.warn(`⚠️ No user ID found to clear cart`);
      }

      // Send order confirmation (don't await to avoid blocking webhook response)
      if (userId) {
        const checkoutService = strapi.service('api::checkout.checkout');
        checkoutService.sendOrderConfirmation(parseInt(userId), order)
          .then(() => {
            console.log(`📧 Order confirmation sent for order ${orderId}`);
          })
          .catch((emailError: any) => {
            console.error(`❌ Failed to send order confirmation:`, emailError.message);
          });
      }

      console.log(`🎉 Checkout session processing completed for order ${orderId}`);
    } catch (error) {
      console.error(`❌ Error handling checkout session completed:`, error);
      console.error(`Error details:`, {
        message: error.message,
        stack: error.stack,
        orderId,
        sessionId: session.id
      });
    }
  },

};
