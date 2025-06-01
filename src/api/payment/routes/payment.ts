/**
 * payment router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Get user's payment history
    {
      method: 'GET',
      path: '/payments/me',
      handler: 'api::payment.payment.myPayments',
      config: {
        policies: [],
      },
    },
    // Update payment status (admin only)
    {
      method: 'PUT',
      path: '/payments/:id/status',
      handler: 'api::payment.payment.updateStatus',
      config: {
        policies: [],
      },
    },
    // Get payment details
    {
      method: 'GET',
      path: '/payments/:id',
      handler: 'api::payment.payment.findOne',
      config: {
        policies: [],
      },
    }
  ],
};
