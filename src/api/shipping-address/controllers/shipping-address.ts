/**
 * shipping-address controller
 */

export default {
  /**
   * Get all shipping addresses for the current user
   */
  async getMyAddresses(ctx: any) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      const addresses = await strapi.service('api::shipping-address.shipping-address').getUserAddresses(user.id);
      
      return { data: addresses };
    } catch (error) {
      console.error('Error getting user addresses:', error);
      ctx.throw(500, error.message || 'An error occurred while fetching addresses');
    }
  },

  /**
   * Add a new shipping address
   */
  async addAddress(ctx: any) {
    try {
      const { user } = ctx.state;
      const addressData = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      // Validate required fields
      const validationErrors = [];
      
      if (!addressData.name) {
        validationErrors.push('Name is required');
      }
      if (!addressData.addressLine1) {
        validationErrors.push('Address line 1 is required');
      }
      if (!addressData.emirate) {
        validationErrors.push('Emirate is required');
      }

      if (validationErrors.length > 0) {
        return ctx.badRequest({
          message: 'Validation failed',
          errors: validationErrors,
        });
      }

      const address = await strapi.service('api::shipping-address.shipping-address').addUserAddress(user.id, addressData);
      
      return { data: address };
    } catch (error) {
      console.error('Error adding address:', error);
      ctx.throw(500, error.message || 'An error occurred while adding the address');
    }
  },

  /**
   * Update a shipping address
   */
  async updateAddress(ctx: any) {
    try {
      const { user } = ctx.state;
      const { id } = ctx.params;
      const addressData = ctx.request.body;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!id) {
        return ctx.badRequest('Address ID is required');
      }

      const address = await strapi.service('api::shipping-address.shipping-address').updateUserAddress(user.id, parseInt(id), addressData);
      
      return { data: address };
    } catch (error) {
      if (error.message === 'Address not found') {
        return ctx.notFound('Address not found');
      }
      console.error('Error updating address:', error);
      ctx.throw(500, error.message || 'An error occurred while updating the address');
    }
  },

  /**
   * Delete a shipping address
   */
  async deleteAddress(ctx: any) {
    try {
      const { user } = ctx.state;
      const { id } = ctx.params;

      if (!user) {
        return ctx.unauthorized('You must be logged in');
      }

      if (!id) {
        return ctx.badRequest('Address ID is required');
      }

      await strapi.service('api::shipping-address.shipping-address').deleteUserAddress(user.id, parseInt(id));
      
      return { data: { message: 'Address deleted successfully' } };
    } catch (error) {
      if (error.message === 'Address not found') {
        return ctx.notFound('Address not found');
      }
      console.error('Error deleting address:', error);
      ctx.throw(500, error.message || 'An error occurred while deleting the address');
    }
  },
};
