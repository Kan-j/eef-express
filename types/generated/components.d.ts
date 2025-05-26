import type { Schema, Struct } from '@strapi/strapi';

export interface AddressAddress extends Struct.ComponentSchema {
  collectionName: 'components_address_addresses';
  info: {
    description: '';
    displayName: 'Address';
  };
  attributes: {
    addressLine1: Schema.Attribute.Text;
    addressLine2: Schema.Attribute.Text;
    apartmentOrVilla: Schema.Attribute.String;
    emirate: Schema.Attribute.Enumeration<
      [
        'Fujairah',
        'Ras Al Khaimah',
        'Umm Al-Quwain',
        'Ajman',
        'Sharjah',
        'Dubai',
        'Abu Dhabi',
      ]
    >;
    name: Schema.Attribute.String;
    phoneNumber: Schema.Attribute.String;
  };
}

export interface AddressDropoffLocation extends Struct.ComponentSchema {
  collectionName: 'components_address_dropoff_locations';
  info: {
    displayName: 'dropoffLocation';
  };
  attributes: {};
}

export interface AddressPickupLocation extends Struct.ComponentSchema {
  collectionName: 'components_address_pickup_locations';
  info: {
    displayName: 'pickupLocation';
  };
  attributes: {};
}

export interface AddressShippingAddress extends Struct.ComponentSchema {
  collectionName: 'components_address_shipping_addresses';
  info: {
    displayName: 'shippingAddress';
  };
  attributes: {};
}

export interface CustomOrderStatus extends Struct.ComponentSchema {
  collectionName: 'components_custom_order_statuses';
  info: {
    displayName: 'orderStatus';
  };
  attributes: {};
}

export interface CustomStatusLog extends Struct.ComponentSchema {
  collectionName: 'components_custom_status_logs';
  info: {
    displayName: 'statusLog';
    icon: 'arrowLeft';
  };
  attributes: {
    locationNote: Schema.Attribute.String;
    shippingStatus: Schema.Attribute.String;
    timestamp: Schema.Attribute.DateTime;
  };
}

export interface CustomStatusOfPickDrop extends Struct.ComponentSchema {
  collectionName: 'components_custom_status_of_pick_drops';
  info: {
    displayName: 'statusOfPickDrop';
    icon: '';
  };
  attributes: {};
}

export interface SharedItems extends Struct.ComponentSchema {
  collectionName: 'components_shared_items';
  info: {
    description: '';
    displayName: 'cart-item';
  };
  attributes: {
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    quantity: Schema.Attribute.Integer;
  };
}

export interface SharedProducts extends Struct.ComponentSchema {
  collectionName: 'components_shared_products';
  info: {
    displayName: 'products';
    icon: '';
  };
  attributes: {};
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'address.address': AddressAddress;
      'address.dropoff-location': AddressDropoffLocation;
      'address.pickup-location': AddressPickupLocation;
      'address.shipping-address': AddressShippingAddress;
      'custom.order-status': CustomOrderStatus;
      'custom.status-log': CustomStatusLog;
      'custom.status-of-pick-drop': CustomStatusOfPickDrop;
      'shared.items': SharedItems;
      'shared.products': SharedProducts;
    }
  }
}
