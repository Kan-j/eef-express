/**
 * pick-drop service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::pick-drop.pick-drop', ({ strapi }) => ({
  /**
   * Create a new pick-drop request
   */
  async createPickDropRequest(userId: number, pickDropData: any) {
    console.log(`📦 Creating pick-drop request for user ${userId}`);

    // Calculate delivery fee if delivery type is provided
    let deliveryFee = 0;
    if (pickDropData.deliveryType) {
      deliveryFee = await this.calculateDeliveryFee(pickDropData.deliveryType);
    }

    // Create the pick-drop request with initial values
    const pickDrop = await strapi.entityService.create('api::pick-drop.pick-drop', {
      data: {
        users_permissions_user: { id: userId },
        senderName: pickDropData.senderName,
        senderPhoneNumber: pickDropData.senderPhoneNumber,
        receiverName: pickDropData.receiverName,
        receiverPhoneNumber: pickDropData.receiverPhoneNumber,
        itemDescription: pickDropData.itemDescription,
        itemWeightKg: pickDropData.itemWeightKg,
        pickupDateTime: pickDropData.pickupDateTime,
        pickupAddress: pickDropData.pickupAddress,
        dropOffLocation: pickDropData.dropOffLocation,
        dropOffDateTime: pickDropData.dropOffDateTime,
        dropOffAddress: pickDropData.dropOffAddress,
        pickDropStatus: 'Pending',
        itemImage: pickDropData.itemImage || null,
        deliveryType: pickDropData.deliveryType || 'Standard',
        scheduledDateTime: pickDropData.scheduledDateTime || null,
        senderAddressLine1: pickDropData.senderAddressLine1 || null,
        senderAddressLine2: pickDropData.senderAddressLine2 || null,
        receiverAddressLine1: pickDropData.receiverAddressLine1 || null,
        receiverAddressLine2: pickDropData.receiverAddressLine2 || null,
        pickupLocation: pickDropData.pickupLocation || null,
        subtotal: 0, // Initially 0, admin will set this
        deliveryFee: deliveryFee,
        totalAmount: deliveryFee, // Initially just delivery fee
        publishedAt: new Date(),
      },
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        }
      },
    });

    console.log(`✅ Pick-drop request created with ID: ${pickDrop.id}`);

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: userId,
        title: 'Pick-Drop Request Created',
        message: `Your pick-drop request #${pickDrop.id} has been created and is pending admin approval.`,
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
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        }
      },
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
   * Get user's pick-drop history with enhanced filtering
   */
  async getUserPickDropHistory(userId: number, params: any = {}) {
    const {
      page = 1,
      pageSize = 10,
      sort = 'createdAt:desc',
      status,
      deliveryType,
      dateFrom,
      dateTo
    } = params;

    console.log(`📄 Getting pick-drop history for user ${userId}`);
    console.log(`   Filters: status=${status}, deliveryType=${deliveryType}, dateFrom=${dateFrom}, dateTo=${dateTo}`);

    // Build filters
    const filters: any = {
      users_permissions_user: { id: userId },
    };

    // Add status filter
    if (status) {
      filters.pickDropStatus = status;
    }

    // Add delivery type filter
    if (deliveryType) {
      filters.deliveryType = deliveryType;
    }

    // Add date range filters
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) {
        filters.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filters.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get pick-drop requests for the user
    const { results, pagination } = await strapi.entityService.findPage('api::pick-drop.pick-drop', {
      filters,
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        }
      },
      sort,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    console.log(`✅ Found ${results.length} pick-drop requests`);

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
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        },
        approvedBy: {
          fields: ['id', 'username', 'email']
        }
      },
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

  /**
   * Calculate delivery fee based on delivery type
   */
  async calculateDeliveryFee(deliveryType: string) {
    try {
      console.log(`💰 Calculating delivery fee for type: ${deliveryType}`);

      const deliveryPricing = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
        filters: {
          type: deliveryType,
        },
      });

      const deliveryFee = deliveryPricing && deliveryPricing.length > 0 ? Number(deliveryPricing[0].amount) : 0;
      console.log(`✅ Delivery fee calculated: ${deliveryFee} AED`);

      return deliveryFee;
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      return 0;
    }
  },

  /**
   * Get all pick-drop requests with filters and pagination (admin view)
   */
  async getAllPickDropRequests(params: any = {}) {
    const {
      page = 1,
      pageSize = 10,
      sort = 'createdAt:desc',
      status,
      deliveryType,
      dateFrom,
      dateTo,
      userId
    } = params;

    console.log(`📄 Getting all pick-drop requests with filters`);

    // Build filters
    const filters: any = {};

    // Add user filter if provided
    if (userId) {
      filters.users_permissions_user = { id: userId };
    }

    // Add status filter
    if (status) {
      filters.pickDropStatus = status;
    }

    // Add delivery type filter
    if (deliveryType) {
      filters.deliveryType = deliveryType;
    }

    // Add date range filters
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) {
        filters.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filters.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get pick-drop requests
    const { results, pagination } = await strapi.entityService.findPage('api::pick-drop.pick-drop', {
      filters,
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        },
        approvedBy: {
          fields: ['id', 'username', 'email']
        }
      },
      sort,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    console.log(`✅ Found ${results.length} pick-drop requests`);

    return { results, pagination };
  },

  /**
   * Approve pick-drop request and set subtotal (admin only)
   */
  async approvePickDropRequest(pickDropId: number, approvalData: any, adminUserId: number) {
    console.log(`✅ Approving pick-drop request ${pickDropId}`);

    // Get the pick-drop request
    const pickDrop = await strapi.entityService.findOne('api::pick-drop.pick-drop', pickDropId, {
      populate: ['users_permissions_user'],
    });

    if (!pickDrop) {
      throw new Error('Pick-drop request not found');
    }

    if ((pickDrop as any).pickDropStatus !== 'Pending') {
      throw new Error('Only pending requests can be approved');
    }

    const { subtotal, adminNotes } = approvalData;

    if (!subtotal || subtotal < 0) {
      throw new Error('Valid subtotal amount is required');
    }

    // Calculate total amount (subtotal + delivery fee)
    const deliveryFee = (pickDrop as any).deliveryFee || 0;
    const totalAmount = parseFloat(subtotal) + deliveryFee;

    console.log(`   Subtotal: ${subtotal} AED`);
    console.log(`   Delivery Fee: ${deliveryFee} AED`);
    console.log(`   Total Amount: ${totalAmount} AED`);

    // Update the pick-drop request
    const updatedPickDrop = await strapi.entityService.update('api::pick-drop.pick-drop', pickDropId, {
      data: {
        pickDropStatus: 'Confirmed',
        subtotal: parseFloat(subtotal),
        totalAmount: totalAmount,
        adminNotes: adminNotes || '',
        approvedAt: new Date(),
        approvedBy: { id: adminUserId },
      },
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        },
        approvedBy: {
          fields: ['id', 'username', 'email']
        }
      },
    });

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: { id: (pickDrop as any).users_permissions_user.id },
        title: 'Pick-Drop Request Approved',
        message: `Your pick-drop request #${pickDropId} has been approved. Total amount: ${totalAmount} AED`,
        read: false,
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Pick-drop request ${pickDropId} approved successfully`);
    return updatedPickDrop;
  },

  /**
   * Update delivery type and recalculate totals
   */
  async updateDeliveryType(pickDropId: number, deliveryType: string, userId?: number) {
    console.log(`🚚 Updating delivery type for pick-drop ${pickDropId} to ${deliveryType}`);

    // Validate delivery type exists in delivery-pricing
    const deliveryPricingExists = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
      filters: {
        type: deliveryType,
      },
    });

    if (!deliveryPricingExists || deliveryPricingExists.length === 0) {
      throw new Error(`Invalid delivery type: ${deliveryType}. No pricing found for this delivery type.`);
    }

    // Build filters
    const filters: any = { id: pickDropId };
    if (userId) {
      filters.users_permissions_user = { id: userId };
    }

    // Get the pick-drop request
    const pickDrops = await strapi.entityService.findMany('api::pick-drop.pick-drop', {
      filters,
      populate: ['users_permissions_user'],
    });

    if (!pickDrops || pickDrops.length === 0) {
      throw new Error('Pick-drop request not found');
    }

    const pickDrop = pickDrops[0];

    // Only allow updates for pending or confirmed requests
    if (!['Pending'].includes((pickDrop as any).pickDropStatus)) {
      throw new Error('Cannot update delivery type for requests that are in transit or completed');
    }

    // Calculate new delivery fee
    const newDeliveryFee = await this.calculateDeliveryFee(deliveryType);
    const subtotal = (pickDrop as any).subtotal || 0;
    const newTotalAmount = subtotal + newDeliveryFee;

    console.log(`   New delivery fee: ${newDeliveryFee} AED`);
    console.log(`   Subtotal: ${subtotal} AED`);
    console.log(`   New total amount: ${newTotalAmount} AED`);

    // Update the pick-drop request
    const updatedPickDrop = await strapi.entityService.update('api::pick-drop.pick-drop', pickDropId, {
      data: {
        deliveryType: deliveryType,
        deliveryFee: newDeliveryFee,
        totalAmount: newTotalAmount,
      },
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        }
      },
    });

    console.log(`✅ Delivery type updated successfully`);
    return updatedPickDrop;
  },

  /**
   * Get delivery pricing options
   */
  async getDeliveryPricingOptions() {
    try {
      const deliveryOptions = await strapi.entityService.findMany('api::delivery-pricing.delivery-pricing', {
        sort: { amount: 'asc' },
      });

      return deliveryOptions.map((option: any) => ({
        type: option.type,
        amount: parseFloat(option.amount),
        description: option.description,
      }));
    } catch (error) {
      console.error('Error fetching delivery pricing options:', error);
      return [];
    }
  },

  /**
   * Update pick-drop request (only if not confirmed)
   */
  async updatePickDropRequest(pickDropId: number, updateData: any, userId: number) {
    console.log(`📝 Updating pick-drop request ${pickDropId} for user ${userId}`);

    // Get the pick-drop request and verify ownership
    const pickDrops = await strapi.entityService.findMany('api::pick-drop.pick-drop', {
      filters: {
        id: pickDropId,
        users_permissions_user: { id: userId }
      },
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        }
      },
    });

    if (!pickDrops || pickDrops.length === 0) {
      throw new Error('Pick-drop request not found');
    }

    const pickDrop = pickDrops[0];
    const currentStatus = (pickDrop as any).pickDropStatus;

    // Only allow updates for pending requests
    if (currentStatus !== 'Pending') {
      throw new Error(`Cannot update pick-drop request. Current status is '${currentStatus}'. Only pending requests can be updated.`);
    }

    console.log(`   Current status: ${currentStatus} - Update allowed`);

    // If delivery type is being updated, recalculate delivery fee
    let deliveryFee = (pickDrop as any).deliveryFee;
    if (updateData.deliveryType && updateData.deliveryType !== (pickDrop as any).deliveryType) {
      console.log(`   Delivery type changing from ${(pickDrop as any).deliveryType} to ${updateData.deliveryType}`);
      deliveryFee = await this.calculateDeliveryFee(updateData.deliveryType);
      console.log(`   New delivery fee: ${deliveryFee} AED`);
    }

    // Calculate new total amount
    const subtotal = (pickDrop as any).subtotal || 0;
    const totalAmount = subtotal + deliveryFee;

    // Prepare update data
    const finalUpdateData = {
      ...updateData,
      deliveryFee,
      totalAmount,
    };

    console.log(`   Final update data:`, {
      ...finalUpdateData,
      itemImage: updateData.itemImage ? 'Image updated' : 'no image update'
    });

    // Update the pick-drop request
    const updatedPickDrop = await strapi.entityService.update('api::pick-drop.pick-drop', pickDropId, {
      data: finalUpdateData,
      populate: {
        itemImage: true,
        users_permissions_user: {
          fields: ['id', 'username', 'email']
        }
      },
    });

    // Create a notification for the user
    await strapi.entityService.create('api::notification.notification', {
      data: {
        users_permissions_user: { id: userId },
        title: 'Pick-Drop Request Updated',
        message: `Your pick-drop request #${pickDropId} has been updated successfully.`,
        read: false,
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Pick-drop request ${pickDropId} updated successfully`);
    return updatedPickDrop;
  },
}));
