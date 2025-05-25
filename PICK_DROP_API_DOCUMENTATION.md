# Pick Drop Request API Documentation

## Overview
The Pick Drop Request functionality allows users to create delivery requests where:
- **Subtotal starts at 0** - Admin must approve and enter the amount
- **Delivery type determines pricing** - Based on delivery-pricing model
- **Final total = subtotal + delivery fee**

## API Endpoints

### 🔐 Authenticated User Endpoints (Primary Focus)

#### 1. Create Pick Drop Request
```
POST /api/pick-drops
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "senderName": "John Doe",
  "senderContact": "+971501234567",
  "receiverName": "Jane Smith",
  "receiverContact": "+971507654321",
  "itemDescription": "Documents and small package",
  "itemWeight": 2.5,
  "preferredPickupTime": "2024-01-15T10:00:00Z",
  "deliveryType": "Same-Day",
  "scheduledDateTime": "2024-01-15T15:00:00Z",
  "pickupLocation": {
    "address": "123 Business Bay",
    "city": "Dubai",
    "state": "Dubai",
    "zipCode": "12345"
  },
  "dropoffLocation": {
    "address": "456 Marina Walk",
    "city": "Dubai", 
    "state": "Dubai",
    "zipCode": "54321"
  },
  "images": [1, 2, 3]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "senderName": "John Doe",
    "pickDropStatus": "Pending",
    "deliveryType": "Same-Day",
    "subtotal": 0,
    "deliveryFee": 25.00,
    "totalAmount": 25.00,
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

#### 2. Get My Pick Drop Requests (with filters)
```
GET /api/pick-drops/me
```
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 10)
- `sort` (default: 'createdAt:desc')
- `status` - Filter by: Pending, Confirmed, Cancelled, In Transit, Completed
- `deliveryType` - Filter by: Standard, Same-Day, Next-Day, Scheduled
- `dateFrom` - ISO date string
- `dateTo` - ISO date string

**Example:**
```
GET /api/pick-drops/me?status=Pending&deliveryType=Same-Day&page=1&pageSize=5
```

**Response:**
```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "pickDropStatus": "Pending",
        "deliveryType": "Same-Day",
        "subtotal": 0,
        "deliveryFee": 25.00,
        "totalAmount": 25.00,
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 5,
      "total": 1,
      "pageCount": 1
    },
    "summary": {
      "total": 1,
      "pending": 1,
      "confirmed": 0,
      "inTransit": 0,
      "completed": 0,
      "cancelled": 0
    }
  }
}
```

#### 3. Get Pick Drop Details
```
GET /api/pick-drops/:id
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "data": {
    "id": 1,
    "senderName": "John Doe",
    "pickDropStatus": "Confirmed",
    "deliveryType": "Same-Day",
    "subtotal": 50.00,
    "deliveryFee": 25.00,
    "totalAmount": 75.00,
    "adminNotes": "Approved for same-day delivery",
    "approvedAt": "2024-01-15T09:00:00Z",
    "pricingBreakdown": {
      "subtotal": 50.00,
      "deliveryFee": 25.00,
      "totalAmount": 75.00
    },
    "availableDeliveryOptions": [
      {
        "type": "Standard",
        "amount": 10.00,
        "description": "Standard delivery"
      },
      {
        "type": "Same-Day",
        "amount": 25.00,
        "description": "Same day delivery"
      }
    ],
    "canUpdateDeliveryType": true
  }
}
```

#### 4. Calculate Delivery Price
```
GET /api/pick-drops/calculate-delivery-price?deliveryType=Same-Day
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "data": {
    "deliveryFee": 25.00,
    "deliveryType": "Same-Day",
    "allOptions": [
      {
        "type": "Standard",
        "amount": 10.00,
        "description": "Standard delivery"
      },
      {
        "type": "Same-Day", 
        "amount": 25.00,
        "description": "Same day delivery"
      }
    ]
  }
}
```

#### 5. Update Delivery Type
```
PUT /api/pick-drops/:id/delivery-type
```
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "deliveryType": "Express"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "deliveryType": "Express",
    "subtotal": 50.00,
    "deliveryFee": 35.00,
    "totalAmount": 85.00
  }
}
```

### 🔧 Admin Endpoints

#### 6. Get All Pick Drop Requests (Admin)
```
GET /api/pick-drops
```
**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:** Same as user endpoint plus:
- `userId` - Filter by specific user ID

#### 7. Approve Pick Drop Request (Admin)
```
PUT /api/pick-drops/:id/approve
```
**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{
  "subtotal": 50.00,
  "adminNotes": "Approved for same-day delivery"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "pickDropStatus": "Confirmed",
    "subtotal": 50.00,
    "deliveryFee": 25.00,
    "totalAmount": 75.00,
    "adminNotes": "Approved for same-day delivery",
    "approvedAt": "2024-01-15T09:00:00Z"
  }
}
```

#### 8. Update Status (Admin)
```
PUT /api/pick-drops/:id/status
```
**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{
  "status": "In Transit",
  "assignedRider": "Rider123"
}
```

## Pricing Logic

### 1. Initial Creation
- **Subtotal:** 0 (admin must set)
- **Delivery Fee:** Calculated based on delivery type
- **Total Amount:** 0 + delivery fee

### 2. After Admin Approval
- **Subtotal:** Set by admin
- **Delivery Fee:** Based on delivery type
- **Total Amount:** subtotal + delivery fee

### 3. Delivery Type Changes
- **Subtotal:** Remains unchanged
- **Delivery Fee:** Recalculated based on new delivery type
- **Total Amount:** subtotal + new delivery fee

## Status Flow

1. **Pending** - Initial state, awaiting admin approval
2. **Confirmed** - Admin approved with subtotal set
3. **In Transit** - Rider assigned and pickup started
4. **Completed** - Delivery completed
5. **Cancelled** - Request cancelled

## Delivery Types & Pricing

Based on `delivery-pricing` model:
- **Standard:** ~10 AED
- **Same-Day:** ~25 AED  
- **Next-Day:** ~15 AED
- **Scheduled:** ~20 AED
- **Express:** ~35 AED

## Error Handling

### Common Error Responses:
```json
{
  "error": {
    "status": 400,
    "name": "BadRequestError", 
    "message": "Delivery type is required"
  }
}
```

### Status Codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (admin required)
- `404` - Not Found
- `500` - Internal Server Error

## Testing with Postman

### 1. Create Request
```
POST {{baseUrl}}/api/pick-drops
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "senderName": "Test User",
  "senderContact": "+971501234567",
  "receiverName": "Test Receiver", 
  "receiverContact": "+971507654321",
  "itemDescription": "Test package",
  "itemWeight": 1.5,
  "deliveryType": "Same-Day"
}
```

### 2. Get My Requests
```
GET {{baseUrl}}/api/pick-drops/me?status=Pending
Authorization: Bearer {{userToken}}
```

### 3. Admin Approve
```
PUT {{baseUrl}}/api/pick-drops/1/approve
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "subtotal": 75.00,
  "adminNotes": "Approved for delivery"
}
```

## Key Features Implemented

✅ **User-focused API endpoints**  
✅ **Advanced filtering and pagination**  
✅ **Pricing calculation logic (subtotal + delivery fee)**  
✅ **Admin approval workflow**  
✅ **Delivery type updates with recalculation**  
✅ **Comprehensive error handling**  
✅ **Status tracking and notifications**  
✅ **Detailed pricing breakdowns**  
✅ **Enhanced logging for debugging**
