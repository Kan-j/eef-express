// src/middlewares/raw-body.ts
// Based on Stripe webhook documentation: https://docs.stripe.com/webhooks

const rawBodyMiddleware = (config: any, { strapi }: any) => {
  return async (ctx: any, next: any) => {
    if (ctx.request.url?.includes('/api/stripe/webhook')) {
      console.log('🔧 Raw body middleware: Processing Stripe webhook');

      // Check if the request stream is readable
      if (!ctx.req.readable) {
        console.log('⚠️ Request stream is not readable, skipping raw body capture');
        await next();
        return;
      }

      const chunks: Buffer[] = [];

      // Collect all chunks
      await new Promise((resolve, reject) => {
        ctx.req.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          console.log(`📦 Received chunk: ${chunk.length} bytes`);
        });

        ctx.req.on('end', () => {
          const rawBody = Buffer.concat(chunks);
          ctx.request.rawBody = rawBody;
          console.log(`🔍 Raw body captured: ${rawBody.length} bytes, isBuffer: ${Buffer.isBuffer(rawBody)}`);
          console.log('✅ Raw body middleware: Setup complete');
          resolve(true);
        });

        ctx.req.on('error', (error: any) => {
          console.error('❌ Error reading request stream:', error);
          reject(error);
        });

        // Add timeout to prevent hanging
        setTimeout(() => {
          reject(new Error('Timeout reading request body'));
        }, 5000);
      });
    }

    await next();
  };
};

export default rawBodyMiddleware;
