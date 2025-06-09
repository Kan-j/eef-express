const rawBodyMiddleware = (config, { strapi }) => {
  return async (ctx, next) => {
    // Only process Stripe webhook requests
    if (ctx.request.url?.includes('/api/stripe/webhook')) {
      strapi.log.info('🔧 Raw body middleware: Processing Stripe webhook request');

      try {
        // Check if the request stream is readable
        if (!ctx.req.readable) {
          strapi.log.warn('⚠️ Request stream is not readable, skipping raw body capture');
          await next();
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;
        const maxSize = 1024 * 1024; // 1MB limit

        // Collect all chunks with size validation
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout reading request body (10s limit)'));
          }, 10000); // 10 second timeout

          ctx.req.on('data', (chunk: Buffer) => {
            totalSize += chunk.length;

            // Prevent memory exhaustion
            if (totalSize > maxSize) {
              clearTimeout(timeout);
              reject(new Error('Request body too large'));
              return;
            }

            chunks.push(chunk);
          });

          ctx.req.on('end', () => {
            clearTimeout(timeout);
            const rawBody = Buffer.concat(chunks);
            ctx.request.rawBody = rawBody;

            strapi.log.info(`🔍 Raw body captured: ${rawBody.length} bytes`);
            resolve();
          });

          ctx.req.on('error', (error: any) => {
            clearTimeout(timeout);
            strapi.log.error('❌ Error reading request stream:', error);
            reject(error);
          });
        });

      } catch (error: any) {
        strapi.log.error('❌ Raw body middleware error:', error.message);
        // Continue processing even if raw body capture fails
        // The webhook handler will handle the missing raw body
      }
    }

    await next();
  };
};


export default rawBodyMiddleware;
