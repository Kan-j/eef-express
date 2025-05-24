/**
 * shipping-address router
 */

export default {
  routes: [
    // Get all user addresses
    {
      method: 'GET',
      path: '/shipping-addresses/me',
      handler: 'api::shipping-address.shipping-address.getMyAddresses',
      config: {
        policies: [],
      },
    },
    // Add new address
    {
      method: 'POST',
      path: '/shipping-addresses',
      handler: 'api::shipping-address.shipping-address.addAddress',
      config: {
        policies: [],
      },
    },
    // Update address
    {
      method: 'PUT',
      path: '/shipping-addresses/:id',
      handler: 'api::shipping-address.shipping-address.updateAddress',
      config: {
        policies: [],
      },
    },
    // Delete address
    {
      method: 'DELETE',
      path: '/shipping-addresses/:id',
      handler: 'api::shipping-address.shipping-address.deleteAddress',
      config: {
        policies: [],
      },
    },
  ],
};
