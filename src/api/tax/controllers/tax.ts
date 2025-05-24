/**
 * tax controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tax.tax', ({ strapi }) => ({
  /**
   * Calculate tax for given amount
   */
  async calculateTax(ctx: any) {
    try {
      const { amount } = ctx.query;

      if (!amount || amount <= 0) {
        return ctx.badRequest('Valid amount is required');
      }

      const taxCalculation = await strapi.service('api::tax.tax').calculateTax(
        parseFloat(amount)
      );

      return { data: taxCalculation };
    } catch (error) {
      console.error('Error calculating tax:', error);
      ctx.throw(500, error.message || 'An error occurred while calculating tax');
    }
  },

  /**
   * Get all active taxes
   */
  async getActiveTaxes(ctx: any) {
    try {
      const taxes = await strapi.service('api::tax.tax').getAllActiveTaxes();

      return { data: taxes };
    } catch (error) {
      console.error('Error getting active taxes:', error);
      ctx.throw(500, error.message || 'An error occurred while fetching taxes');
    }
  },

  /**
   * Get current active tax
   */
  async getCurrentTax(ctx: any) {
    try {
      const tax = await strapi.service('api::tax.tax').getCurrentActiveTax();

      return { data: tax };
    } catch (error) {
      console.error('Error getting current tax:', error);
      ctx.throw(500, error.message || 'An error occurred while fetching current tax');
    }
  },

  /**
   * Create default taxes (admin only)
   */
  async createDefaults(ctx: any) {
    try {
      // Check if user is admin
      const { user } = ctx.state;
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can create default taxes');
      }

      const defaultTax = await strapi.service('api::tax.tax').createDefaultTaxes();

      return { data: defaultTax };
    } catch (error) {
      console.error('Error creating default taxes:', error);
      ctx.throw(500, error.message || 'An error occurred while creating default taxes');
    }
  },
}));
