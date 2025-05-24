/**
 * shipping-address service
 */

export default {
  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: number) {
    try {
      // Get user with addresses
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['addresses'],
      }) as any; // Use type assertion to include addresses

      if (!user || !user.addresses) {
        return [];
      }

      // Transform addresses to include IDs and format them properly
      return user.addresses.map((address: any, index: number) => ({
        id: index + 1, // Since addresses are components, we use index as ID
        name: address.name,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        apartmentOrVilla: address.apartmentOrVilla,
        emirate: address.emirate,
      }));
    } catch (error) {
      console.error('Error getting user addresses:', error);
      throw error;
    }
  },

  /**
   * Add a new address for a user
   */
  async addUserAddress(userId: number, addressData: any) {
    try {
      // Get current user with addresses
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['addresses'],
      }) as any; // Use type assertion to include addresses

      if (!user) {
        throw new Error('User not found');
      }

      // Prepare new address
      const newAddress = {
        name: addressData.name,
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2 || '',
        apartmentOrVilla: addressData.apartmentOrVilla || '',
        emirate: addressData.emirate,
      };

      // Add new address to existing addresses
      const currentAddresses = user.addresses || [];
      const updatedAddresses = [...currentAddresses, newAddress];

      // Update user with new addresses
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          addresses: updatedAddresses,
        },
        populate: ['addresses'],
      }) as any; // Use type assertion to include addresses

      // Return the newly added address with an ID
      const addressIndex = updatedUser.addresses.length;
      return {
        id: addressIndex,
        ...newAddress,
      };
    } catch (error) {
      console.error('Error adding user address:', error);
      throw error;
    }
  },

  /**
   * Update an address for a user
   */
  async updateUserAddress(userId: number, addressId: number, addressData: any) {
    try {
      // Get current user with addresses
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['addresses'],
      }) as any; // Use type assertion to include addresses

      if (!user) {
        throw new Error('User not found');
      }

      const currentAddresses = user.addresses || [];
      const addressIndex = addressId - 1; // Convert ID to index

      if (addressIndex < 0 || addressIndex >= currentAddresses.length) {
        throw new Error('Address not found');
      }

      // Update the address
      const updatedAddress = {
        name: addressData.name || currentAddresses[addressIndex].name,
        addressLine1: addressData.addressLine1 || currentAddresses[addressIndex].addressLine1,
        addressLine2: addressData.addressLine2 !== undefined ? addressData.addressLine2 : currentAddresses[addressIndex].addressLine2,
        apartmentOrVilla: addressData.apartmentOrVilla !== undefined ? addressData.apartmentOrVilla : currentAddresses[addressIndex].apartmentOrVilla,
        emirate: addressData.emirate || currentAddresses[addressIndex].emirate,
      };

      // Replace the address at the specific index
      const updatedAddresses = [...currentAddresses];
      updatedAddresses[addressIndex] = updatedAddress;

      // Update user with modified addresses
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          addresses: updatedAddresses,
        },
      });

      return {
        id: addressId,
        ...updatedAddress,
      };
    } catch (error) {
      console.error('Error updating user address:', error);
      throw error;
    }
  },

  /**
   * Delete an address for a user
   */
  async deleteUserAddress(userId: number, addressId: number) {
    try {
      // Get current user with addresses
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['addresses'],
      }) as any; // Use type assertion to include addresses

      if (!user) {
        throw new Error('User not found');
      }

      const currentAddresses = user.addresses || [];
      const addressIndex = addressId - 1; // Convert ID to index

      if (addressIndex < 0 || addressIndex >= currentAddresses.length) {
        throw new Error('Address not found');
      }

      // Remove the address at the specific index
      const updatedAddresses = currentAddresses.filter((_: any, index: number) => index !== addressIndex);

      // Update user with modified addresses
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          addresses: updatedAddresses,
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting user address:', error);
      throw error;
    }
  },
};
