/**
 * tax router
 */

export default {
  routes: [
    // Calculate tax
    {
      method: 'GET',
      path: '/tax/calculate',
      handler: 'api::tax.tax.calculateTax',
      config: {
        policies: [],
      },
    },
    // Get all active taxes
    {
      method: 'GET',
      path: '/tax/active',
      handler: 'api::tax.tax.getActiveTaxes',
      config: {
        policies: [],
      },
    },
    // Get current active tax
    {
      method: 'GET',
      path: '/tax/current',
      handler: 'api::tax.tax.getCurrentTax',
      config: {
        policies: [],
      },
    },
    // Create default taxes (admin only)
    {
      method: 'POST',
      path: '/tax/create-defaults',
      handler: 'api::tax.tax.createDefaults',
      config: {
        policies: [],
      },
    },
  ],
};
