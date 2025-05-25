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
    console.log(`🔍 Request URL: ${ctx.request.url}`);
    console.log(`🔍 Request Method: ${ctx.request.method}`);

    // Log all request headers
    console.log(`📜 Request Headers:`, JSON.stringify(ctx.request.headers, null, 2));

    // Log request body information
    console.log(`📜 Request Body Info:`);
    console.log(`   ctx.request.body type: ${typeof ctx.request.body}`);
    console.log(`   ctx.request.body: ${ctx.request.body ? 'Present' : 'Missing'}`);
    console.log(`   ctx.request.rawBody type: ${typeof ctx.request.rawBody}`);
    console.log(`   ctx.request.rawBody: ${ctx.request.rawBody ? 'Present' : 'Missing'}`);

    if (ctx.request.body) {
      console.log(`   ctx.request.body length: ${ctx.request.body.length || 'N/A'}`);
      console.log(`   ctx.request.body isBuffer: ${Buffer.isBuffer(ctx.request.body)}`);
    }

    if (ctx.request.rawBody) {
      console.log(`   ctx.request.rawBody length: ${ctx.request.rawBody.length || 'N/A'}`);
      console.log(`   ctx.request.rawBody isBuffer: ${Buffer.isBuffer(ctx.request.rawBody)}`);
    }

    try {

    const sig = ctx.request.headers['stripe-signature'];
    const raw = ctx.request.rawBody;
    let event: any;

    console.log(`🔍 Pre-verification data:`);
    console.log(`   sig: ${sig}`);
    console.log(`   raw type: ${typeof raw}`);
    console.log(`   raw: ${raw ? 'Present' : 'Missing'}`);
    console.log(`   STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Present' : 'Missing'}`);

    if (raw && Buffer.isBuffer(raw)) {
      console.log(`   raw buffer length: ${raw.length}`);
      console.log(`   raw buffer first 100 chars: ${raw.toString().substring(0, 100)}...`);
    }

    console.log(`🔐 Signature verification details:`);
    console.log(`   Signature header: ${sig ? 'Present' : 'Missing'}`);
    console.log(`   Raw body type: ${typeof raw}`);
    console.log(`   Raw body length: ${raw ? raw.length : 'N/A'}`);
    console.log(`   Raw body is Buffer: ${Buffer.isBuffer(raw)}`);
    console.log(`   Webhook secret configured: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Yes' : 'No'}`);

    try {
      event = stripe.webhooks.constructEvent(
        raw,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log(`✅ Webhook signature verified successfully`);

      // Log the complete event object
      console.log(`📜 Complete Event Object:`, JSON.stringify(event, null, 2));

    } catch (err: any) {
      console.error('🔐 Webhook signature verification failed:', err.message);
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
    console.log(`📜 Event Data Object:`, JSON.stringify(event.data, null, 2));

    // 🎯 Only handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log(`🎯 Processing checkout.session.completed event`);

      const session = event.data.object;
      console.log(`📋 Session details:`, {
        id: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        customer: session.customer,
        customerEmail: session.customer_email
      });

      const orderId = session.metadata?.order_id;
      const userId = session.metadata?.user_id;

      console.log(`🔍 Metadata extraction:`);
      console.log(`   Order ID: ${orderId || 'Missing'}`);
      console.log(`   User ID: ${userId || 'Missing'}`);

      if (!orderId || !userId) {
        console.error('❌ Missing metadata: order_id or user_id not found in session');
        console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
        return ctx.badRequest('Invalid metadata');
      }

      console.log(`🔍 Step 1: Checking if order exists...`);
      console.log(`   Looking for order ID: ${orderId}`);
      console.log(`   Order ID type: ${typeof orderId}`);

      // Check if the order exists
      const existingOrder = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: ['payment'], // Optional: check existing payment
      });

      console.log(`📜 Order query result:`, existingOrder ? 'Found' : 'Not found');
      if (existingOrder) {
        console.log(`📜 Complete Order Object:`, JSON.stringify(existingOrder, null, 2));
      }

      if (!existingOrder) {
        console.error(`❌ Order not found for ID ${orderId}`);
        console.error(`🏁 ===== WEBHOOK ERROR END =====\n`);
        return ctx.notFound('Order not found');
      }

      console.log(`✅ Order found:`, {
        id: (existingOrder as any).id,
        paymentStatus: (existingOrder as any).paymentStatus,
        totalAmount: (existingOrder as any).totalAmount,
        hasPayment: !!(existingOrder as any).payment
      });

      // Prevent duplicate webhook processing
      if ((existingOrder as any).paymentStatus === 'completed') {
        console.log(`ℹ️ Order ${orderId} already marked as completed. Skipping.`);
        console.log(`🏁 ===== STRIPE WEBHOOK COMPLETED =====\n`);
        return ctx.send({ received: true });
      }

      console.log(`🔄 Step 2: Updating order payment status...`);
      // ✅ Mark order as paid
      await strapi.entityService.update('api::order.order', orderId, {
        data: {
          paymentStatus: 'completed',
          publishedAt: new Date(),
        },
      });
      console.log(`✅ Order ${orderId} marked as completed`);

      console.log(`💳 Step 3: Recording Stripe payment...`);

      const paymentData = {
        amount: session.amount_total / 100, // Convert from cents
        status: 'completed' as const,
        paymentMethod: 'card' as const,
        transactionId: session.id,
        paymentDetails: {
          stripeSessionId: session.id,
          stripeCustomerId: session.customer,
          stripePaymentIntentId: session.payment_intent,
          customerEmail: session.customer_email,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          completedAt: new Date().toISOString(),
        },
        order: orderId,
        users_permissions_user: userId,
        publishedAt: new Date(),
      };

      console.log(`📜 Payment data to create:`, JSON.stringify(paymentData, null, 2));

      // 💳 Record Stripe Payment
      const paymentRecord = await strapi.entityService.create('api::payment.payment', {
        data: paymentData,
      });

      console.log(`✅ Payment record created with ID: ${(paymentRecord as any).id}`);
      console.log(`📜 Created Payment Record:`, JSON.stringify(paymentRecord, null, 2));

      console.log(`🧹 Step 4: Clearing user cart...`);
      // Clear the cart now that payment is completed
      try {
        const cartService = strapi.service('api::cart.cart');
        await cartService.clearCart(parseInt(userId));
        console.log(`✅ Cart cleared for user ${userId}`);
      } catch (cartError: any) {
        console.error(`⚠️ Failed to clear cart for user ${userId}:`, cartError.message);
        // Don't fail the webhook for cart clearing issues
      }

      console.log(`📧 Step 5: Scheduling order confirmation...`);
      // Schedule order confirmation (don't await to avoid blocking webhook response)
      setImmediate(() => {
        try {
          const checkoutService = strapi.service('api::checkout.checkout');
          checkoutService.sendOrderConfirmation(parseInt(userId), existingOrder)
            .then(() => {
              console.log(`📧 Order confirmation sent for order ${orderId}`);
            })
            .catch((emailError: any) => {
              console.error(`❌ Failed to send order confirmation:`, emailError.message);
            });
        } catch (emailServiceError: any) {
          console.error(`⚠️ Email service error:`, emailServiceError.message);
        }
      });

      console.log(`🎉 Order ${orderId} processing completed successfully!`);
      console.log(`📊 Summary:`);
      console.log(`   Order ID: ${orderId}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Payment Amount: $${session.amount_total / 100}`);
      console.log(`   Stripe Session: ${session.id}`);
      console.log(`   Payment Record ID: ${(paymentRecord as any).id}`);
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log(`🏁 ===== STRIPE WEBHOOK COMPLETED =====\n`);
    return ctx.send({ received: true });

    } catch (globalError: any) {
      console.error(`\n💥 ===== WEBHOOK GLOBAL ERROR =====`);
      console.error(`❌ Error Type: ${globalError.constructor.name}`);
      console.error(`❌ Error Message: ${globalError.message}`);
      console.error(`❌ Error Stack:`, globalError.stack);
      console.error(`🏁 ===== WEBHOOK GLOBAL ERROR END =====\n`);

      // Always return 200 to Stripe to prevent retries
      return ctx.send({
        received: true,
        error: 'Webhook processing failed',
        details: globalError.message
      });
    }
  },
};
