# Order Management API Documentation

## Overview

Comprehensive order management system with endpoints for both users and administrators to manage orders throughout their lifecycle.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## User Endpoints

### 1. Get My Orders
**GET** `/api/orders/me`

Get the authenticated user's order history with filtering and pagination.

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 10)
- `sort` (string, optional): Sort order (default: 'createdAt:desc')
- `paymentStatus` (string, optional): Filter by payment status
- `deliveryType` (string, optional): Filter by delivery type

#### Example Request
```bash
GET /api/orders/me?page=1&pageSize=10&paymentStatus=completed
Authorization: Bearer <jwt_token>
```

#### Example Response
```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "attributes": {
          "deliveryType": "Express",
          "deliveryFee": 15.00,
          "totalAmount": 97.98,
          "subTotal": 82.98,
          "paymentMethod": "card",
          "paymentStatus": "completed",
          "createdAt": "2025-05-25T00:00:00.000Z",
          "products": [
            {
              "id": 1,
              "product": {
                "id": 1,
                "attributes": {
                  "name": "Product Name",
                  "price": 29.99
                }
              },
              "quantity": 2
            }
          ],
          "shippingAddress": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "address": "123 Main St",
            "city": "New York",
            "state": "NY",
            "zipCode": "10001"
          },
          "orderStatus": [
            {
              "shippingStatus": "Order Placed",
              "timestamp": "2025-05-25T00:00:00.000Z",
              "locationNote": "Order received"
            },
            {
              "shippingStatus": "Processing",
              "timestamp": "2025-05-25T01:00:00.000Z",
              "locationNote": "Order is being prepared"
            }
          ]
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

### 2. Get Order Details
**GET** `/api/orders/:id`

Get detailed information about a specific order. Users can only access their own orders.

#### Example Request
```bash
GET /api/orders/1
Authorization: Bearer <jwt_token>
```

### 3. Cancel Order
**PUT** `/api/orders/:id/cancel`

Cancel an order. Users can only cancel their own orders and only if the order is in 'pending' or 'processing' status.

#### Request Body
```json
{
  "reason": "Changed my mind about the purchase"
}
```

#### Example Request
```bash
PUT /api/orders/1/cancel
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "reason": "No longer needed"
}
```

## Admin Endpoints

### 1. Get All Orders
**GET** `/api/orders/admin/all`

Get all orders in the system with advanced filtering (Admin only).

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 25)
- `sort` (string, optional): Sort order (default: 'createdAt:desc')
- `paymentStatus` (string, optional): Filter by payment status
- `deliveryType` (string, optional): Filter by delivery type
- `dateFrom` (string, optional): Filter orders from date (ISO format)
- `dateTo` (string, optional): Filter orders to date (ISO format)
- `minAmount` (number, optional): Filter by minimum order amount
- `maxAmount` (number, optional): Filter by maximum order amount

#### Example Request
```bash
GET /api/orders/admin/all?paymentStatus=completed&dateFrom=2025-05-01&dateTo=2025-05-31
Authorization: Bearer <admin_jwt_token>
```

### 2. Get Order Statistics
**GET** `/api/orders/admin/stats`

Get comprehensive order statistics and analytics (Admin only).

#### Query Parameters
- `dateFrom` (string, optional): Statistics from date (ISO format)
- `dateTo` (string, optional): Statistics to date (ISO format)

#### Example Request
```bash
GET /api/orders/admin/stats?dateFrom=2025-05-01&dateTo=2025-05-31
Authorization: Bearer <admin_jwt_token>
```

#### Example Response
```json
{
  "data": {
    "totalOrders": 150,
    "totalRevenue": 12450.75,
    "averageOrderValue": 83.01,
    "ordersByStatus": {
      "pending": 5,
      "processing": 10,
      "completed": 130,
      "failed": 3,
      "refunded": 2
    },
    "ordersByDeliveryType": {
      "Standard": 80,
      "Express": 45,
      "Same-Day": 15,
      "Next-Day": 8,
      "Scheduled": 2
    },
    "ordersByPaymentMethod": {
      "card": 120,
      "cash_on_delivery": 25,
      "paypal": 3,
      "apple_pay": 1,
      "google_pay": 1
    },
    "recentOrders": [
      // Last 10 orders
    ]
  },
  "meta": {
    "timestamp": "2025-05-25T00:00:00.000Z",
    "generatedBy": 1
  }
}
```

### 3. Search Orders
**GET** `/api/orders/admin/search`

Search orders by various criteria (Admin only).

#### Query Parameters
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 25)
- `sort` (string, optional): Sort order (default: 'createdAt:desc')
- `search` (string, optional): Text search in customer name, email, phone
- `userId` (number, optional): Filter by specific user ID
- `orderId` (number, optional): Search for specific order ID

#### Example Request
```bash
GET /api/orders/admin/search?search=john@example.com
Authorization: Bearer <admin_jwt_token>
```

### 4. Update Order Status
**PUT** `/api/orders/:id/status`

Update the general order status (Admin only).

#### Request Body
```json
{
  "status": "Processing",
  "locationNote": "Order is being prepared in warehouse"
}
```

### 5. Update Delivery Status
**PUT** `/api/orders/:id/delivery-status`

Update delivery status with tracking information (Admin only).

#### Request Body
```json
{
  "status": "Out for Delivery",
  "locationNote": "Package is on delivery truck",
  "estimatedDelivery": "2025-05-25T18:00:00.000Z"
}
```

#### Example Request
```bash
PUT /api/orders/1/delivery-status
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "status": "Delivered",
  "locationNote": "Package delivered to front door",
  "estimatedDelivery": "2025-05-25T15:30:00.000Z"
}
```

### 6. Update Payment Status
**PUT** `/api/orders/:id/payment-status`

Update the payment status of an order (Admin only).

#### Request Body
```json
{
  "status": "completed"
}
```

## Order Status Flow

### Payment Status
- `pending` - Payment not yet processed
- `processing` - Payment is being processed
- `completed` - Payment successful
- `failed` - Payment failed or order cancelled
- `refunded` - Payment refunded

### Delivery Status (in orderStatus array)
- `Order Placed` - Initial status
- `Processing` - Order being prepared
- `Packed` - Order packed and ready
- `Shipped` - Order shipped
- `Out for Delivery` - On delivery vehicle
- `Delivered` - Successfully delivered
- `Cancelled` - Order cancelled

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Order ID is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "You must be logged in"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Only administrators can view all orders"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Order not found"
  }
}
```

## Features

### ✅ **User Features**
- View personal order history with filtering
- Get detailed order information
- Cancel orders (if eligible)
- Real-time order status tracking

### ✅ **Admin Features**
- View all orders with advanced filtering
- Comprehensive order statistics and analytics
- Search orders by multiple criteria
- Update order and delivery status
- Manage payment status
- Cancel any order with reason tracking

### ✅ **System Features**
- Automatic notifications for status updates
- Order cancellation with reason tracking
- Comprehensive logging for debugging
- Pagination for large datasets
- Advanced filtering and search capabilities
- Real-time order tracking with status history

## Testing with Postman

### 1. Get User Orders
```
GET {{baseUrl}}/api/orders/me?page=1&pageSize=10
Authorization: Bearer {{userToken}}
```

### 2. Cancel Order
```
PUT {{baseUrl}}/api/orders/1/cancel
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

### 3. Admin - Get All Orders
```
GET {{baseUrl}}/api/orders/admin/all?paymentStatus=completed
Authorization: Bearer {{adminToken}}
```

### 4. Admin - Get Statistics
```
GET {{baseUrl}}/api/orders/admin/stats
Authorization: Bearer {{adminToken}}
```

### 5. Admin - Update Delivery Status
```
PUT {{baseUrl}}/api/orders/1/delivery-status
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "status": "Delivered",
  "locationNote": "Package delivered successfully"
}
```

This comprehensive order management system provides full lifecycle management for orders with proper role-based access control and detailed tracking capabilities.
