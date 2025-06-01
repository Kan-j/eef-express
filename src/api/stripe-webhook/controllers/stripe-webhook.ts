/**
 * stripe-webhook controller
 * Enhanced implementation following Stripe best practices
 * https://docs.stripe.com/webhooks
 */

import Stripe from 'stripe';

// Initialize Stripe with proper error handling
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

// Webhook configuration
const WEBHOOK_CONFIG = {
  secret: process.env.STRIPE_WEBHOOK_SECRET || '',
  toleranceSeconds: 300, // 5 minutes tolerance for timestamp verification
  supportedEvents: [
    'checkout.session.completed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'invoice.payment_succeeded',
    'invoice.payment_failed'
  ]
};

// In-memory store for processed events (in production, use Redis or database)
const processedEvents = new Set<string>();

export default {
  /**
   * Handle Stripe webhook events with enhanced security and error handling
   */
  async handleWebhook(ctx: any) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    strapi.log.info(`\n🔔 ===== STRIPE WEBHOOK RECEIVED [${requestId}] =====`);
    strapi.log.info(`📅 Timestamp: ${new Date().toISOString()}`);
    strapi.log.info(`🌐 IP Address: ${ctx.request.ip}`);
    strapi.log.info(`🔍 Request URL: ${ctx.request.url}`);
    strapi.log.info(`🔍 User-Agent: ${ctx.request.headers['user-agent'] || 'N/A'}`);

    // Validate environment configuration
    if (!WEBHOOK_CONFIG.secret) {
      strapi.log.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return ctx.badRequest('Webhook not configured');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      strapi.log.error('❌ STRIPE_SECRET_KEY not configured');
      return ctx.badRequest('Stripe not configured');
    }

    try {
      // Extract signature and raw body
      const signature = ctx.request.headers['stripe-signature'];
      const rawBody = ctx.request.rawBody;

      strapi.log.info(`🔐 Signature verification:`);
      strapi.log.info(`   Signature header: ${signature ? 'Present' : 'Missing'}`);
      strapi.log.info(`   Raw body: ${rawBody ? `${rawBody.length} bytes` : 'Missing'}`);
      strapi.log.info(`   Raw body is Buffer: ${Buffer.isBuffer(rawBody)}`);

      // Verify webhook signature
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          WEBHOOK_CONFIG.secret,
          WEBHOOK_CONFIG.toleranceSeconds
        );
        strapi.log.info(`✅ Webhook signature verified successfully`);
      } catch (err: any) {
        strapi.log.error(`🔐 Webhook signature verification failed: ${err.message}`);
        strapi.log.error(`🔍 Debug info:`, {
          signaturePresent: !!signature,
          rawBodyType: typeof rawBody,
          rawBodyLength: rawBody ? rawBody.length : 'N/A',
          rawBodyIsBuffer: Buffer.isBuffer(rawBody),
          webhookSecretConfigured: !!WEBHOOK_CONFIG.secret
        });
        return ctx.badRequest('Invalid signature');
      }

      // Log event details
      strapi.log.info(`🔔 Event Type: ${event.type}`);
      strapi.log.info(`🆔 Event ID: ${event.id}`);
      strapi.log.info(`📅 Event Created: ${new Date(event.created * 1000).toISOString()}`);

      // Check if event type is supported
      if (!WEBHOOK_CONFIG.supportedEvents.includes(event.type)) {
        strapi.log.info(`ℹ️ Unhandled event type: ${event.type} - skipping`);
        return ctx.send({ received: true, message: 'Event type not handled' });
      }

      // Implement idempotency - prevent duplicate processing
      const eventKey = `${event.id}_${event.type}`;
      if (processedEvents.has(eventKey)) {
        strapi.log.info(`ℹ️ Event ${event.id} already processed - skipping duplicate`);
        return ctx.send({ received: true, message: 'Event already processed' });
      }

      // Add to processed events (with cleanup for memory management)
      processedEvents.add(eventKey);
      if (processedEvents.size > 1000) {
        // Keep only the last 1000 events in memory
        const eventsArray = Array.from(processedEvents);
        processedEvents.clear();
        eventsArray.slice(-500).forEach(id => processedEvents.add(id));
      }

      // Process the event based on type
      await this.processWebhookEvent(event, requestId);

      strapi.log.info(`🏁 ===== STRIPE WEBHOOK COMPLETED [${requestId}] =====\n`);
      return ctx.send({ received: true });

    } catch (globalError: any) {
      strapi.log.error(`\n💥 ===== WEBHOOK GLOBAL ERROR [${requestId}] =====`);
      strapi.log.error(`❌ Error Type: ${globalError.constructor.name}`);
      strapi.log.error(`❌ Error Message: ${globalError.message}`);
      strapi.log.error(`❌ Error Stack:`, globalError.stack);
      strapi.log.error(`🏁 ===== WEBHOOK GLOBAL ERROR END =====\n`);

      // Always return 200 to Stripe to prevent retries for application errors
      return ctx.send({
        received: true,
        error: 'Webhook processing failed',
        details: globalError.message
      });
    }
  },

  /**
   * Process individual webhook events
   */
  async processWebhookEvent(event: Stripe.Event, requestId: string) {
    strapi.log.info(`🎯 Processing ${event.type} event [${requestId}]`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event, requestId);
        break;

      case 'payment_intent.succeeded':
        strapi.log.info(`ℹ️ Payment intent succeeded: ${event.id}`);
        // Add handler if needed
        break;

      case 'payment_intent.payment_failed':
        strapi.log.info(`ℹ️ Payment intent failed: ${event.id}`);
        // Add handler if needed
        break;

      case 'invoice.payment_succeeded':
        strapi.log.info(`ℹ️ Invoice payment succeeded: ${event.id}`);
        // Add handler if needed
        break;

      case 'invoice.payment_failed':
        strapi.log.info(`ℹ️ Invoice payment failed: ${event.id}`);
        // Add handler if needed
        break;

      default:
        strapi.log.info(`ℹ️ No handler for event type: ${event.type}`);
    }
  },

  /**
   * Handle checkout.session.completed events
   */
  async handleCheckoutSessionCompleted(event: Stripe.Event, requestId: string) {
    strapi.log.info(`🎯 Processing checkout.session.completed event [${requestId}]`);

    const session = event.data.object as Stripe.Checkout.Session;
    strapi.log.info(`📋 Session details:`, {
      id: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customer: session.customer,
      customerEmail: session.customer_email
    });

    const orderId = session.metadata?.order_id;
    const userId = session.metadata?.user_id;

    strapi.log.info(`🔍 Metadata extraction:`);
    strapi.log.info(`   Order ID: ${orderId || 'Missing'}`);
    strapi.log.info(`   User ID: ${userId || 'Missing'}`);

    if (!orderId || !userId) {
      strapi.log.error('❌ Missing metadata: order_id or user_id not found in session');
      throw new Error('Invalid metadata: missing order_id or user_id');
    }

    strapi.log.info(`🔍 Step 1: Checking if order exists...`);
    strapi.log.info(`   Looking for order ID: ${orderId}`);

    // Check if the order exists
    const existingOrder = await strapi.entityService.findOne('api::order.order', orderId, {
      populate: ['payment'],
    });

    strapi.log.info(`📜 Order query result:`, existingOrder ? 'Found' : 'Not found');

    if (!existingOrder) {
      strapi.log.error(`❌ Order not found for ID ${orderId}`);
      throw new Error(`Order not found: ${orderId}`);
    }

    strapi.log.info(`✅ Order found:`, {
      id: (existingOrder as any).id,
      paymentStatus: (existingOrder as any).paymentStatus,
      totalAmount: (existingOrder as any).totalAmount,
      hasPayment: !!(existingOrder as any).payment
    });

    // Prevent duplicate webhook processing
    if ((existingOrder as any).paymentStatus === 'completed') {
      strapi.log.info(`ℹ️ Order ${orderId} already marked as completed. Skipping.`);
      return;
    }

    strapi.log.info(`🔄 Step 2: Updating order payment status...`);
    // ✅ Mark order as paid
    await strapi.entityService.update('api::order.order', orderId, {
      data: {
        paymentStatus: 'completed',
        publishedAt: new Date(),
      },
    });

    strapi.log.info(`✅ Order ${orderId} marked as completed`);

    strapi.log.info(`💳 Step 3: Creating payment record...`);
    // 💳 Create payment record with proper type handling
    const paymentData = {
      amount: session.amount_total / 100, // Convert from cents
      status: 'completed' as const,
      paymentMethod: 'card' as const,
      transactionId: session.id,
      paymentDetails: {
        stripeSessionId: session.id,
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email,
        completedAt: new Date().toISOString(),
      },
      order: orderId,
      users_permissions_user: userId,
      publishedAt: new Date(),
    };

    strapi.log.info(`📜 Payment data to create:`, JSON.stringify(paymentData, null, 2));

    // 💳 Record Stripe Payment
    const paymentRecord = await strapi.entityService.create('api::payment.payment', {
      data: paymentData,
    });

    strapi.log.info(`✅ Payment record created with ID: ${(paymentRecord as any).id}`);

    strapi.log.info(`🧹 Step 4: Clearing user cart...`);
    // Clear the cart now that payment is completed
    try {
      const cartService = strapi.service('api::cart.cart');
      await cartService.clearCart(parseInt(userId));
      strapi.log.info(`✅ Cart cleared for user ${userId}`);
    } catch (cartError: any) {
      strapi.log.error(`⚠️ Failed to clear cart for user ${userId}:`, cartError.message);
      // Don't fail the webhook for cart clearing issues
    }

    strapi.log.info(`📧 Step 5: Scheduling order confirmation...`);
    // Schedule order confirmation (don't await to avoid blocking webhook response)
    setImmediate(() => {
      try {
        const checkoutService = strapi.service('api::checkout.checkout');
        checkoutService.sendOrderConfirmation(parseInt(userId), existingOrder)
          .then(() => {
            strapi.log.info(`📧 Order confirmation sent for order ${orderId}`);
          })
          .catch((emailError: any) => {
            strapi.log.error(`❌ Failed to send order confirmation:`, emailError.message);
          });
      } catch (emailServiceError: any) {
        strapi.log.error(`⚠️ Email service error:`, emailServiceError.message);
      }
    });

    strapi.log.info(`🎉 Order ${orderId} processing completed successfully!`);
    strapi.log.info(`📊 Summary:`);
    strapi.log.info(`   Order ID: ${orderId}`);
    strapi.log.info(`   User ID: ${userId}`);
    strapi.log.info(`   Payment Amount: $${session.amount_total / 100}`);
    strapi.log.info(`   Stripe Session: ${session.id}`);
    strapi.log.info(`   Payment Record ID: ${(paymentRecord as any).id}`);
  }
};
