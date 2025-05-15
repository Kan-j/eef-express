/**
 * pick-drop service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::pick-drop.pick-drop', ({ strapi }) => ({
  /**
   * Create a new pick-drop request
   */
  async createPickDropRequest(userId: number, pickDropData: any) {
    // Create the pick-drop request
    const pickDrop = await strapi.entityService.create('api::pick-drop.pick-drop', {
      data: {
        users_permissions_user: { id: userId },
        senderName: pickDropData.senderName,
        senderContact: pickDropData.senderContact,
        receiverName: pickDropData.receiverName,
        receiverContact: pickDropData.receiverContact,
        itemDescription: pickDropData.itemDescription,
        itemWeight: pickDropData.itemWeight,
        preferredPickupTime: pickDropData.preferredPickupTime,
        pickDropStatus: 'Pending',
        images: pickDropData.images || [],
        publishedAt: new Date(),
      },
      populate: ['images', 'users_permissions_user'],
    });

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: userId,
        title: 'Pick-Drop Request Created',
        message: `Your pick-drop request #${pickDrop.id} has been created and is pending confirmation.`,
        read: false,
        publishedAt: new Date(),
      },
    });

    return pickDrop;
  },

  /**
   * Update pick-drop status
   */
  async updatePickDropStatus(pickDropId: number, status: string, assignedRider?: string) {
    // Get the pick-drop request
    const pickDrop = await strapi.entityService.findOne('api::pick-drop.pick-drop', pickDropId, {
      populate: ['users_permissions_user'],
    });

    if (!pickDrop) {
      throw new Error('Pick-drop request not found');
    }

    // Update data
    const updateData: any = {
      pickDropStatus: status,
    };

    // If rider is assigned, update that too
    if (assignedRider) {
      updateData.assignedRider = assignedRider;
    }

    // Update the pick-drop request
    const updatedPickDrop = await strapi.entityService.update('api::pick-drop.pick-drop', pickDropId, {
      data: updateData,
      populate: ['images', 'users_permissions_user'],
    });

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: { id: (pickDrop as any).users_permissions_user.id },
        title: 'Pick-Drop Status Updated',
        message: `Your pick-drop request #${pickDropId} status has been updated to ${status}.`,
        read: false,
        publishedAt: new Date(),
      },
    });

    return updatedPickDrop;
  },

  /**
   * Get user's pick-drop history
   */
  async getUserPickDropHistory(userId: number, params: any = {}) {
    const { page = 1, pageSize = 10, sort = 'createdAt:desc' } = params;

    // Get pick-drop requests for the user
    const { results, pagination } = await strapi.entityService.findPage('api::pick-drop.pick-drop', {
      filters: {
        users_permissions_user: { id: userId },
      },
      populate: ['images'],
      sort,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    return { results, pagination };
  },

  /**
   * Get pick-drop details
   */
  async getPickDropDetails(pickDropId: number, userId?: number) {
    const filters: any = {
      id: pickDropId,
    };

    // If userId is provided, ensure the pick-drop belongs to the user
    if (userId) {
      filters.users_permissions_user = { id: userId };
    }

    // Get the pick-drop request
    const pickDrops = await strapi.entityService.findMany('api::pick-drop.pick-drop', {
      filters,
      populate: ['images', 'users_permissions_user'],
    });

    if (!pickDrops || pickDrops.length === 0) {
      throw new Error('Pick-drop request not found');
    }

    return pickDrops[0];
  },

  /**
   * Calculate pick-drop price based on weight
   */
  async calculatePrice(weight: number) {
    // Simple pricing calculation based on weight
    // In a real application, you might have a more complex pricing model
    const basePrice = 10; // Base price in AED
    const pricePerKg = 5; // Additional price per kg

    const price = basePrice + (weight * pricePerKg);

    return parseFloat(price.toFixed(2));
  },
}));
