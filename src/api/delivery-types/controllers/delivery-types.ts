/**
 * delivery-types controller
 */

export default {
  /**
   * Get all delivery types with pricing
   */
  async getAll(ctx: any) {
    try {
      const deliveryTypes = await strapi.service('api::delivery-types.delivery-types').getAllDeliveryTypes();
      
      return { data: deliveryTypes };
    } catch (error) {
      console.error('Error getting delivery types:', error);
      ctx.throw(500, error.message || 'An error occurred while fetching delivery types');
    }
  },
};
