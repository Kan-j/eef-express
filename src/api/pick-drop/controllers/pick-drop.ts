/**
 * pick-drop controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::pick-drop.pick-drop', ({ strapi }) => ({
  /**
   * Create a new pick-drop request
   */
  async createRequest(ctx) {
    try {
      const { user } = ctx.state;
      const pickDropData = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // Validate required fields
      if (!pickDropData.senderName) {
        return ctx.badRequest('Sender name is required');
      }

      if (!pickDropData.senderContact) {
        return ctx.badRequest('Sender contact is required');
      }

      if (!pickDropData.receiverName) {
        return ctx.badRequest('Receiver name is required');
      }

      if (!pickDropData.receiverContact) {
        return ctx.badRequest('Receiver contact is required');
      }

      if (!pickDropData.itemDescription) {
        return ctx.badRequest('Item description is required');
      }

      if (!pickDropData.itemWeight) {
        return ctx.badRequest('Item weight is required');
      }

      // Create the pick-drop request
      const pickDrop = await strapi.service('api::pick-drop.pick-drop').createPickDropRequest(user.id, pickDropData);

      return this.transformResponse(pickDrop);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Update pick-drop status (admin only)
   */
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, assignedRider } = ctx.request.body;

      // Check if user is admin (you might need to adjust this based on your roles)
      const { user } = ctx.state;
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can update pick-drop status');
      }

      if (!id) {
        return ctx.badRequest('Pick-drop ID is required');
      }

      if (!status) {
        return ctx.badRequest('Status is required');
      }

      // Update the pick-drop status
      const pickDrop = await strapi.service('api::pick-drop.pick-drop').updatePickDropStatus(
        parseInt(id),
        status,
        assignedRider
      );

      return this.transformResponse(pickDrop);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get user's pick-drop history
   */
  async myPickDrops(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const data = await strapi.service('api::pick-drop.pick-drop').getUserPickDropHistory(user.id, query);

      return this.transformResponse(data);
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  /**
   * Get pick-drop details
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;

      if (!id) {
        return ctx.badRequest('Pick-drop ID is required');
      }

      // If user is admin, get any pick-drop. Otherwise, only get user's own pick-drops
      const isAdmin = user && user.role && user.role.type === 'admin';
      const userId = !isAdmin ? user.id : undefined;

      const pickDrop = await strapi.service('api::pick-drop.pick-drop').getPickDropDetails(parseInt(id), userId);

      return this.transformResponse(pickDrop);
    } catch (error) {
      if (error.message === 'Pick-drop request not found') {
        return ctx.notFound('Pick-drop request not found');
      }
      ctx.throw(500, error);
    }
  },

  /**
   * Calculate price based on weight
   */
  async calculatePrice(ctx) {
    try {
      const { weight } = ctx.query as { weight: string };

      if (!weight) {
        return ctx.badRequest('Weight is required');
      }

      const price = await strapi.service('api::pick-drop.pick-drop').calculatePrice(parseFloat(weight));

      return this.transformResponse({ price });
    } catch (error) {
      ctx.throw(500, error);
    }
  },
}));
