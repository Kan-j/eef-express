/**
 * delivery-types service
 */

export default {
  /**
   * Get all delivery types with pricing
   */
  async getAllDeliveryTypes() {
    try {
      const deliveryPricing = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
        sort: { type: 'asc' },
      });

      // Transform the data to include additional information
      const deliveryTypes = deliveryPricing.map((pricing: any) => ({
        id: pricing.id,
        type: pricing.type,
        amount: parseFloat(pricing.amount),
        description: pricing.description || this.getDefaultDescription(pricing.type),
        estimatedTime: this.getEstimatedTime(pricing.type),
        icon: this.getDeliveryIcon(pricing.type),
      }));

      return deliveryTypes;
    } catch (error) {
      console.error('Error fetching delivery types:', error);
      throw error;
    }
  },

  /**
   * Get default description for delivery type
   */
  getDefaultDescription(type: string): string {
    const descriptions = {
      'Standard': '3-5 business days',
      'Express': '1-2 business days',
      'Same-Day': 'Same day delivery (order before 2 PM)',
      'Next-Day': 'Next business day',
      'Scheduled': 'Choose your preferred date and time',
    };
    return descriptions[type] || 'Delivery service';
  },

  /**
   * Get estimated delivery time
   */
  getEstimatedTime(type: string): string {
    const times = {
      'Standard': '3-5 days',
      'Express': '1-2 days',
      'Same-Day': 'Same day',
      'Next-Day': '1 day',
      'Scheduled': 'As scheduled',
    };
    return times[type] || 'Variable';
  },

  /**
   * Get delivery icon
   */
  getDeliveryIcon(type: string): string {
    const icons = {
      'Standard': 'truck',
      'Express': 'shipping-fast',
      'Same-Day': 'clock',
      'Next-Day': 'calendar-day',
      'Scheduled': 'calendar-alt',
    };
    return icons[type] || 'truck';
  },
};
