/**
 * pick-drop controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::pick-drop.pick-drop', ({ strapi }) => ({
  /**
   * Create a new pick-drop request with form data (including file uploads)
   */
  async createRequest(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      console.log(`📦 Creating pick-drop request for user ${user.id}`);

      // Extract form data
      const { body, files } = ctx.request;
      const pickDropData = body;

      console.log(`   Request data:`, {
        senderName: pickDropData.senderName,
        receiverName: pickDropData.receiverName,
        itemDescription: pickDropData.itemDescription,
        deliveryType: pickDropData.deliveryType,
        hasFiles: files && files.itemImage ? 1 : 0
      });

      // Validate required fields
      if (!pickDropData.senderName) {
        return ctx.badRequest('Sender name is required');
      }

      if (!pickDropData.senderPhoneNumber) {
        return ctx.badRequest('Sender phone number is required');
      }

      if (!pickDropData.receiverName) {
        return ctx.badRequest('Receiver name is required');
      }

      if (!pickDropData.receiverPhoneNumber) {
        return ctx.badRequest('Receiver phone number is required');
      }

      if (!pickDropData.itemDescription) {
        return ctx.badRequest('Item description is required');
      }

      if (!pickDropData.itemWeightKg) {
        return ctx.badRequest('Item weight is required');
      }

      // Handle image upload if provided
      let uploadedImageId = null;
      if (files && files.itemImage) {
        try {
          console.log(`📷 Processing image upload...`);

          const imageFile = files.itemImage;
          const fileName = (imageFile as any).name || (imageFile as any).originalFilename || 'unnamed file';
          console.log(`   Uploading: ${fileName}`);

          // Upload file using Strapi's upload service
          const uploadedFiles = await strapi.plugins.upload.services.upload.upload({
            data: {
              refId: null,
              ref: null,
              field: null,
            },
            files: imageFile,
          });

          // Get uploaded file ID
          if (uploadedFiles && uploadedFiles.length > 0) {
            uploadedImageId = uploadedFiles[0].id;
            console.log(`   ✅ Uploaded: ${uploadedFiles[0].name} (ID: ${uploadedFiles[0].id})`);
          }

          console.log(`✅ Successfully uploaded image`);
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          return ctx.badRequest('Error uploading images. Please try again.');
        }
      }

      // Prepare data for service with proper field mapping
      const serviceData = {
        senderName: pickDropData.senderName,
        senderPhoneNumber: pickDropData.senderPhoneNumber,
        receiverName: pickDropData.receiverName,
        receiverPhoneNumber: pickDropData.receiverPhoneNumber,
        itemDescription: pickDropData.itemDescription,
        itemWeightKg: parseFloat(pickDropData.itemWeightKg) || 0,
        pickupDateTime: pickDropData.pickupDateTime,
        pickupAddress: pickDropData.pickupAddress,
        dropOffLocation: pickDropData.dropOffLocation,
        dropOffDateTime: pickDropData.dropOffDateTime,
        dropOffAddress: pickDropData.dropOffAddress,
        deliveryType: pickDropData.deliveryType || 'Standard',
        scheduledDateTime: pickDropData.scheduledDateTime,
        senderAddressLine1: pickDropData.senderAddressLine1,
        senderAddressLine2: pickDropData.senderAddressLine2,
        receiverAddressLine1: pickDropData.receiverAddressLine1,
        receiverAddressLine2: pickDropData.receiverAddressLine2,
        pickupLocation: pickDropData.pickupLocation,
        itemImage: uploadedImageId,
      };

      console.log(`   Prepared service data:`, {
        ...serviceData,
        itemImage: uploadedImageId ? 'Image uploaded' : 'No image'
      });

      // Create the pick-drop request
      const pickDrop = await strapi.service('api::pick-drop.pick-drop').createPickDropRequest(user.id, serviceData);

      console.log(`✅ Pick-drop request created successfully with ID: ${pickDrop.id}`);
      return this.transformResponse(pickDrop);
    } catch (error) {
      console.error('Create pick-drop request error:', error);
      ctx.throw(500, error.message || 'An error occurred while creating the pick-drop request');
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
   * Get user's pick-drop history with enhanced filtering
   */
  async myPickDrops(ctx) {
    try {
      const { user } = ctx.state;
      const { query } = ctx;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      console.log(`📄 Getting pick-drop history for user ${user.id}`);
      console.log(`   Query parameters:`, query);

      const data = await strapi.service('api::pick-drop.pick-drop').getUserPickDropHistory(user.id, query);

      // Add summary statistics
      const summary = {
        total: data.pagination.total,
        pending: 0,
        confirmed: 0,
        inTransit: 0,
        completed: 0,
        cancelled: 0,
      };

      // Count status occurrences
      data.results.forEach((pickDrop: any) => {
        const status = pickDrop.pickDropStatus?.toLowerCase();
        if (status === 'pending') summary.pending++;
        else if (status === 'confirmed') summary.confirmed++;
        else if (status === 'in transit') summary.inTransit++;
        else if (status === 'completed') summary.completed++;
        else if (status === 'cancelled') summary.cancelled++;
      });

      return this.transformResponse({
        ...data,
        summary
      });
    } catch (error) {
      console.error('My pick-drops error:', error);
      ctx.throw(500, error.message || 'An error occurred while fetching your pick-drop requests');
    }
  },

  /**
   * Get pick-drop details with pricing breakdown
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;

      if (!id) {
        return ctx.badRequest('Pick-drop ID is required');
      }

      console.log(`📎 Getting pick-drop details for ID: ${id}`);

      // If user is admin, get any pick-drop. Otherwise, only get user's own pick-drops
      const isAdmin = user && user.role && user.role.type === 'admin';
      const userId = !isAdmin ? user?.id : undefined;

      const pickDrop = await strapi.service('api::pick-drop.pick-drop').getPickDropDetails(parseInt(id), userId);

      // Add pricing breakdown and delivery options
      const deliveryOptions = await strapi.service('api::pick-drop.pick-drop').getDeliveryPricingOptions();

      const response = {
        ...pickDrop,
        pricingBreakdown: {
          subtotal: (pickDrop as any).subtotal || 0,
          deliveryFee: (pickDrop as any).deliveryFee || 0,
          totalAmount: (pickDrop as any).totalAmount || 0,
        },
        availableDeliveryOptions: deliveryOptions,
        canUpdateDeliveryType: ['Pending', 'Confirmed'].includes((pickDrop as any).pickDropStatus),
      };

      console.log(`✅ Pick-drop details retrieved successfully`);
      return this.transformResponse(response);
    } catch (error) {
      console.error('Find one pick-drop error:', error);
      if (error.message === 'Pick-drop request not found') {
        return ctx.notFound('Pick-drop request not found');
      }
      ctx.throw(500, error.message || 'An error occurred while fetching pick-drop details');
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

  /**
   * Calculate delivery price based on delivery type
   */
  async calculateDeliveryPrice(ctx) {
    try {
      const { deliveryType } = ctx.query as { deliveryType: string };

      if (!deliveryType) {
        return ctx.badRequest('Delivery type is required');
      }

      const deliveryFee = await strapi.service('api::pick-drop.pick-drop').calculateDeliveryFee(deliveryType);
      const deliveryOptions = await strapi.service('api::pick-drop.pick-drop').getDeliveryPricingOptions();

      return this.transformResponse({
        deliveryFee,
        deliveryType,
        allOptions: deliveryOptions
      });
    } catch (error) {
      console.error('Calculate delivery price error:', error);
      ctx.throw(500, error.message || 'An error occurred while calculating delivery price');
    }
  },

  /**
   * Update delivery type for a pick-drop request
   */
  async updateDeliveryType(ctx) {
    try {
      const { id } = ctx.params;
      const { deliveryType } = ctx.request.body;
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!id) {
        return ctx.badRequest('Pick-drop ID is required');
      }

      if (!deliveryType) {
        return ctx.badRequest('Delivery type is required');
      }

      const updatedPickDrop = await strapi.service('api::pick-drop.pick-drop').updateDeliveryType(
        parseInt(id),
        deliveryType,
        user.id
      );

      return this.transformResponse(updatedPickDrop);
    } catch (error) {
      console.error('Update delivery type error:', error);
      if (error.message === 'Pick-drop request not found') {
        return ctx.notFound('Pick-drop request not found');
      }
      if (error.message.includes('Cannot update delivery type')) {
        return ctx.badRequest(error.message);
      }
      ctx.throw(500, error.message || 'An error occurred while updating delivery type');
    }
  },

  /**
   * Update pick-drop request (authenticated user only, if not confirmed)
   */
  async updateRequest(ctx) {
    try {
      const { id } = ctx.params;
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!id) {
        return ctx.badRequest('Pick-drop ID is required');
      }

      console.log(`📝 Updating pick-drop request ${id} for user ${user.id}`);

      // Extract form data
      const { body, files } = ctx.request;
      const updateData = body;

      console.log(`   Update data:`, {
        senderName: updateData.senderName,
        receiverName: updateData.receiverName,
        itemDescription: updateData.itemDescription,
        deliveryType: updateData.deliveryType,
        hasFiles: files && files.itemImage ? 1 : 0
      });

      // Handle image upload if provided
      let uploadedImageId = null;
      if (files && files.itemImage) {
        try {
          console.log(`📷 Processing image upload for update...`);

          const imageFile = files.itemImage;
          const fileName = (imageFile as any).name || (imageFile as any).originalFilename || 'unnamed file';
          console.log(`   Uploading: ${fileName}`);

          // Upload file using Strapi's upload service
          const uploadedFiles = await strapi.plugins.upload.services.upload.upload({
            data: {
              refId: null,
              ref: null,
              field: null,
            },
            files: imageFile,
          });

          // Get uploaded file ID
          if (uploadedFiles && uploadedFiles.length > 0) {
            uploadedImageId = uploadedFiles[0].id;
            console.log(`   ✅ Uploaded: ${uploadedFiles[0].name} (ID: ${uploadedFiles[0].id})`);
          }

          console.log(`✅ Successfully uploaded new image`);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          return ctx.badRequest('Error uploading image. Please try again.');
        }
      }

      // Prepare update data for service - only include fields that are provided
      const serviceUpdateData: any = {};

      // Only add fields that are provided in the update
      if (updateData.senderName !== undefined) serviceUpdateData.senderName = updateData.senderName;
      if (updateData.senderPhoneNumber !== undefined) serviceUpdateData.senderPhoneNumber = updateData.senderPhoneNumber;
      if (updateData.receiverName !== undefined) serviceUpdateData.receiverName = updateData.receiverName;
      if (updateData.receiverPhoneNumber !== undefined) serviceUpdateData.receiverPhoneNumber = updateData.receiverPhoneNumber;
      if (updateData.itemDescription !== undefined) serviceUpdateData.itemDescription = updateData.itemDescription;
      if (updateData.itemWeightKg !== undefined) serviceUpdateData.itemWeightKg = parseFloat(updateData.itemWeightKg);
      if (updateData.pickupDateTime !== undefined) serviceUpdateData.pickupDateTime = updateData.pickupDateTime;
      if (updateData.pickupAddress !== undefined) serviceUpdateData.pickupAddress = updateData.pickupAddress;
      if (updateData.dropOffLocation !== undefined) serviceUpdateData.dropOffLocation = updateData.dropOffLocation;
      if (updateData.dropOffDateTime !== undefined) serviceUpdateData.dropOffDateTime = updateData.dropOffDateTime;
      if (updateData.dropOffAddress !== undefined) serviceUpdateData.dropOffAddress = updateData.dropOffAddress;
      if (updateData.deliveryType !== undefined) serviceUpdateData.deliveryType = updateData.deliveryType;
      if (updateData.scheduledDateTime !== undefined) serviceUpdateData.scheduledDateTime = updateData.scheduledDateTime;
      if (updateData.senderAddressLine1 !== undefined) serviceUpdateData.senderAddressLine1 = updateData.senderAddressLine1;
      if (updateData.senderAddressLine2 !== undefined) serviceUpdateData.senderAddressLine2 = updateData.senderAddressLine2;
      if (updateData.receiverAddressLine1 !== undefined) serviceUpdateData.receiverAddressLine1 = updateData.receiverAddressLine1;
      if (updateData.receiverAddressLine2 !== undefined) serviceUpdateData.receiverAddressLine2 = updateData.receiverAddressLine2;
      if (updateData.pickupLocation !== undefined) serviceUpdateData.pickupLocation = updateData.pickupLocation;

      // Only include image if a new one was uploaded
      if (uploadedImageId) {
        serviceUpdateData.itemImage = uploadedImageId;
      }

      // Remove undefined values
      Object.keys(serviceUpdateData).forEach(key => {
        if (serviceUpdateData[key] === undefined) {
          delete serviceUpdateData[key];
        }
      });

      console.log(`   Prepared update data:`, {
        ...serviceUpdateData,
        itemImage: uploadedImageId ? 'New image uploaded' : 'No new image'
      });

      const updatedPickDrop = await strapi.service('api::pick-drop.pick-drop').updatePickDropRequest(
        parseInt(id),
        serviceUpdateData,
        user.id
      );

      console.log(`✅ Pick-drop request ${id} updated successfully`);
      return this.transformResponse(updatedPickDrop);
    } catch (error) {
      console.error('Update pick-drop request error:', error);
      if (error.message === 'Pick-drop request not found') {
        return ctx.notFound('Pick-drop request not found');
      }
      if (error.message.includes('Cannot update')) {
        return ctx.badRequest(error.message);
      }
      ctx.throw(500, error.message || 'An error occurred while updating the pick-drop request');
    }
  },

  /**
   * Get all pick-drop requests with filters and pagination
   */
  async findAll(ctx) {
    try {
      const { query } = ctx;
      const { user } = ctx.state;

      // Check if user is admin for full access
      const isAdmin = user && user.role && user.role.type === 'admin';

      if (!isAdmin) {
        return ctx.forbidden('Only administrators can view all pick-drop requests');
      }

      const data = await strapi.service('api::pick-drop.pick-drop').getAllPickDropRequests(query);

      return this.transformResponse(data);
    } catch (error) {
      console.error('Find all pick-drops error:', error);
      ctx.throw(500, error.message || 'An error occurred while fetching pick-drop requests');
    }
  },

  /**
   * Approve pick-drop request and set subtotal (admin only)
   */
  async approveRequest(ctx) {
    try {
      const { id } = ctx.params;
      const { subtotal, adminNotes } = ctx.request.body;
      const { user } = ctx.state;

      // Check if user is admin
      if (!user || !user.role || user.role.type !== 'admin') {
        return ctx.forbidden('Only administrators can approve pick-drop requests');
      }

      if (!id) {
        return ctx.badRequest('Pick-drop ID is required');
      }

      if (!subtotal || subtotal < 0) {
        return ctx.badRequest('Valid subtotal amount is required');
      }

      const approvedPickDrop = await strapi.service('api::pick-drop.pick-drop').approvePickDropRequest(
        parseInt(id),
        { subtotal, adminNotes },
        user.id
      );

      return this.transformResponse(approvedPickDrop);
    } catch (error) {
      console.error('Approve pick-drop error:', error);
      if (error.message === 'Pick-drop request not found') {
        return ctx.notFound('Pick-drop request not found');
      }
      if (error.message.includes('Only pending requests')) {
        return ctx.badRequest(error.message);
      }
      ctx.throw(500, error.message || 'An error occurred while approving pick-drop request');
    }
  },
}));
