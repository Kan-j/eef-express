/**
 * payment service
 */

import { factories } from '@strapi/strapi';

// Define payment status type
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// Define payment method type
type PaymentMethod = 'credit_card' | 'paypal' | 'apple_pay' | 'google_pay' | 'cash_on_delivery' | 'bank_transfer';

// Define payment data interface
interface PaymentData {
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paymentDetails?: any;
  orderId?: number;
  userId?: number;
}

export default factories.createCoreService('api::payment.payment', ({ strapi }) => ({
  /**
   * Create a new payment
   */
  async createPayment(paymentData: PaymentData) {
    try {
      // Create the payment
      const payment = await strapi.entityService.create('api::payment.payment', {
        data: {
          amount: paymentData.amount,
          status: paymentData.status,
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId,
          paymentDetails: paymentData.paymentDetails || {},
          order: paymentData.orderId ? { id: paymentData.orderId } : null,
          users_permissions_user: paymentData.userId ? { id: paymentData.userId } : null,
          publishedAt: new Date(),
        },
        populate: ['order'],
      });

      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId: number, status: PaymentStatus) {
    try {
      // Get the payment
      const payment = await strapi.entityService.findOne('api::payment.payment', paymentId, {
        populate: ['order'],
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Update the payment
      const updatedPayment = await strapi.entityService.update('api::payment.payment', paymentId, {
        data: {
          status,
        },
        populate: ['order', 'users_permissions_user'],
      }) as any; // Use type assertion to avoid TypeScript errors

      // If payment is completed or failed, update the order status accordingly
      if (updatedPayment.order && (status === 'completed' || status === 'failed')) {
        const orderStatus = status === 'completed' ? 'Processing' : 'Payment Failed';
        const locationNote = status === 'completed'
          ? 'Payment confirmed, order is being processed'
          : 'Payment failed, please contact customer support';

        await strapi.service('api::order.order').updateOrderStatus(
          updatedPayment.order.id,
          orderStatus,
          locationNote
        );
      }

      // Create a notification for the user
      if (updatedPayment.users_permissions_user) {
        const statusMessages: Record<PaymentStatus, string> = {
          pending: 'Your payment is pending.',
          processing: 'Your payment is being processed.',
          completed: 'Your payment has been completed successfully.',
          failed: 'Your payment has failed. Please try again or contact customer support.',
          refunded: 'Your payment has been refunded.',
        };

        await strapi.entityService.create('api::notification.notification', {
          data: {
            users_permissions_user: updatedPayment.users_permissions_user.id,
            title: `Payment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: statusMessages[status] || `Your payment status has been updated to ${status}.`,
            read: false,
            publishedAt: new Date(),
          },
        });
      }

      return updatedPayment;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId: number, userId?: number) {
    try {
      const filters: any = {
        id: paymentId,
      };

      // If userId is provided, ensure the payment belongs to the user
      if (userId) {
        filters.users_permissions_user = { id: userId };
      }

      // Get the payment
      const payments = await strapi.entityService.findMany('api::payment.payment', {
        filters,
        populate: ['order', 'users_permissions_user'],
      });

      if (!payments || payments.length === 0) {
        throw new Error('Payment not found');
      }

      return payments[0];
    } catch (error) {
      console.error('Error getting payment details:', error);
      throw error;
    }
  },

  /**
   * Get user's payment history
   */
  async getUserPayments(userId: number, params: any = {}) {
    try {
      const { page = 1, pageSize = 10, sort = 'createdAt:desc' } = params;

      // Get payments for the user
      const { results, pagination } = await strapi.entityService.findPage('api::payment.payment', {
        filters: {
          users_permissions_user: { id: userId },
        },
        populate: ['order'],
        sort,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });

      return { results, pagination };
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  },
}));
