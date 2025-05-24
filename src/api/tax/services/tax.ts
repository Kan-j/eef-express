/**
 * tax service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::tax.tax', ({ strapi }) => ({
  /**
   * Calculate tax for a given amount using the current active tax
   */
  async calculateTax(amount: number) {
    try {
      // Get the current active tax
      const activeTax = await this.getCurrentActiveTax();

      if (!activeTax) {
        return {
          taxAmount: 0,
          taxRate: 0,
          taxDetails: [],
          totalWithTax: amount,
        };
      }

      // Check if amount meets minimum requirement
      if (amount < activeTax.minimumAmount) {
        return {
          taxAmount: 0,
          taxRate: 0,
          taxDetails: [],
          totalWithTax: amount,
        };
      }

      // Convert percentage rate to decimal (e.g., 10% -> 0.10)
      const decimalRate = activeTax.rate / 100;

      // Calculate tax amount
      let taxAmount = amount * decimalRate;

      // Apply maximum tax limit if specified
      if (activeTax.maximumAmount && taxAmount > activeTax.maximumAmount) {
        taxAmount = activeTax.maximumAmount;
      }

      const taxDetails = [{
        id: activeTax.id,
        name: activeTax.name,
        type: activeTax.type,
        rate: decimalRate,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        description: activeTax.description,
      }];

      return {
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        taxRate: decimalRate,
        taxDetails,
        totalWithTax: parseFloat((amount + taxAmount).toFixed(2)),
      };
    } catch (error) {
      console.error('Error calculating tax:', error);
      throw error;
    }
  },

  /**
   * Get the current active tax
   */
  async getCurrentActiveTax() {
    try {
      const currentDate = new Date();

      const taxes = await strapi.entityService.findMany('api::tax.tax', {
        filters: {
          isActive: true,
          applicableFrom: {
            $lte: currentDate,
          },
          $or: [
            { applicableTo: null },
            { applicableTo: { $gte: currentDate } }
          ],
        },
        sort: { createdAt: 'desc' }, // Get the most recently created active tax
        pagination: {
          limit: 1, // Only get one tax
        },
      });

      return taxes && taxes.length > 0 ? taxes[0] : null;
    } catch (error) {
      console.error('Error getting current active tax:', error);
      throw error;
    }
  },

  /**
   * Get all active tax rates
   */
  async getAllActiveTaxes() {
    try {
      const currentDate = new Date();

      const taxes = await strapi.entityService.findMany('api::tax.tax', {
        filters: {
          isActive: true,
          applicableFrom: {
            $lte: currentDate,
          },
          $or: [
            { applicableTo: null },
            { applicableTo: { $gte: currentDate } }
          ],
        },
        sort: { createdAt: 'desc' },
      });

      return taxes;
    } catch (error) {
      console.error('Error getting all active taxes:', error);
      throw error;
    }
  },

  /**
   * Create default VAT tax rate
   */
  async createDefaultTaxes() {
    try {
      // Check if default VAT already exists
      const existingVAT = await strapi.entityService.findMany('api::tax.tax', {
        filters: {
          name: 'Default VAT',
        },
      });

      if (existingVAT && existingVAT.length > 0) {
        console.log('Default VAT tax already exists');
        return existingVAT[0];
      }

      // Create Default VAT (5%)
      const defaultVAT = await strapi.entityService.create('api::tax.tax', {
        data: {
          name: 'Default VAT',
          rate: 5, // 5% (stored as percentage, not decimal)
          type: 'VAT',
          applicableFrom: new Date('2018-01-01'),
          isActive: true,
          description: 'Default Value Added Tax at 5%',
          minimumAmount: 0,
          publishedAt: new Date(),
        },
      });

      console.log('Created default VAT tax');
      return defaultVAT;
    } catch (error) {
      console.error('Error creating default taxes:', error);
      throw error;
    }
  },
}));
