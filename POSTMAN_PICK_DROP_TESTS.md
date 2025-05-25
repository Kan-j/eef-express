# Postman Tests for Pick Drop Request API

## Environment Variables Setup

First, set up these variables in your Postman environment:

```
baseUrl = http://localhost:1337
userToken = your_user_jwt_token
adminToken = your_admin_jwt_token
pickDropId = 1
```

---

## 1. Upload Images (Optional - if you want to include photos)

### Request
```
POST {{baseUrl}}/api/upload
```

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: multipart/form-data
```

**Body (form-data):**
```
Key: files
Type: File
Value: [Select your image files - package-photo-1.jpg, package-photo-2.jpg, etc.]
```

### Expected Response (200 OK)
```json
[
  {
    "id": 1,
    "name": "package-photo-1.jpg",
    "alternativeText": null,
    "caption": null,
    "width": 1920,
    "height": 1080,
    "formats": {
      "thumbnail": {
        "name": "thumbnail_package-photo-1.jpg",
        "url": "/uploads/thumbnail_package_photo_1_abc123.jpg"
      },
      "small": {
        "name": "small_package-photo-1.jpg",
        "url": "/uploads/small_package_photo_1_abc123.jpg"
      }
    },
    "hash": "package_photo_1_abc123",
    "ext": ".jpg",
    "mime": "image/jpeg",
    "size": 245.6,
    "url": "/uploads/package_photo_1_abc123.jpg",
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": 2,
    "name": "package-photo-2.jpg",
    "url": "/uploads/package_photo_2_def456.jpg",
    "createdAt": "2024-01-15T08:00:00.000Z"
  }
]
```

---

## 2. Create Pick Drop Request

### Request
```
POST {{baseUrl}}/api/pick-drops
```

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "senderName": "John Doe",
  "senderContact": "+971501234567",
  "receiverName": "Jane Smith",
  "receiverContact": "+971507654321",
  "itemDescription": "Important documents and small electronics package",
  "itemWeight": 2.5,
  "preferredPickupTime": "2024-01-15T10:00:00Z",
  "deliveryType": "Same-Day",
  "scheduledDateTime": "2024-01-15T15:00:00Z",
  "pickupLocation": {
    "address": "123 Business Bay Tower",
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
  "images": [1, 2]
}
```

### Expected Response (201 Created)
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and small electronics package",
    "itemWeight": 2.5,
    "preferredPickupTime": "2024-01-15T10:00:00.000Z",
    "pickDropStatus": "Pending",
    "deliveryType": "Same-Day",
    "scheduledDateTime": "2024-01-15T15:00:00.000Z",
    "subtotal": 0,
    "deliveryFee": 25,
    "totalAmount": 25,
    "adminNotes": null,
    "approvedAt": null,
    "approvedBy": null,
    "assignedRider": null,
    "pickupLocation": {
      "id": 1,
      "address": "123 Business Bay Tower",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "12345"
    },
    "dropoffLocation": {
      "id": 2,
      "address": "456 Marina Walk",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "54321"
    },
    "images": [
      {
        "id": 1,
        "name": "package-photo-1.jpg",
        "url": "/uploads/package_photo_1_abc123.jpg",
        "width": 1920,
        "height": 1080,
        "formats": {
          "thumbnail": {
            "url": "/uploads/thumbnail_package_photo_1_abc123.jpg"
          },
          "small": {
            "url": "/uploads/small_package_photo_1_abc123.jpg"
          }
        },
        "createdAt": "2024-01-15T08:00:00.000Z"
      },
      {
        "id": 2,
        "name": "package-photo-2.jpg",
        "url": "/uploads/package_photo_2_def456.jpg",
        "createdAt": "2024-01-15T08:00:00.000Z"
      }
    ],
    "users_permissions_user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T08:30:00.000Z",
    "publishedAt": "2024-01-15T08:30:00.000Z"
  },
  "meta": {}
}
```

---

## 3. Get My Pick Drop Requests (with filters)

### Request
```
GET {{baseUrl}}/api/pick-drops/me?status=Pending&deliveryType=Same-Day&page=1&pageSize=5
```

**Headers:**
```
Authorization: Bearer {{userToken}}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "documentId": "abc123def456",
        "senderName": "John Doe",
        "receiverName": "Jane Smith",
        "itemDescription": "Important documents and small electronics package",
        "pickDropStatus": "Pending",
        "deliveryType": "Same-Day",
        "subtotal": 0,
        "deliveryFee": 25,
        "totalAmount": 25,
        "preferredPickupTime": "2024-01-15T10:00:00.000Z",
        "scheduledDateTime": "2024-01-15T15:00:00.000Z",
        "pickupLocation": {
          "id": 1,
          "address": "123 Business Bay Tower",
          "city": "Dubai"
        },
        "dropoffLocation": {
          "id": 2,
          "address": "456 Marina Walk",
          "city": "Dubai"
        },
        "images": [],
        "createdAt": "2024-01-15T08:30:00.000Z",
        "updatedAt": "2024-01-15T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 5,
      "pageCount": 1,
      "total": 1
    },
    "summary": {
      "total": 1,
      "pending": 1,
      "confirmed": 0,
      "inTransit": 0,
      "completed": 0,
      "cancelled": 0
    }
  },
  "meta": {}
}
```

---

## 4. Calculate Delivery Price

### Request
```
GET {{baseUrl}}/api/pick-drops/calculate-delivery-price?deliveryType=Express
```

**Headers:**
```
Authorization: Bearer {{userToken}}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "deliveryFee": 35,
    "deliveryType": "Express",
    "allOptions": [
      {
        "type": "Standard",
        "amount": 10,
        "description": "Standard delivery (2-5 business days)"
      },
      {
        "type": "Same-Day",
        "amount": 25,
        "description": "Same day delivery"
      },
      {
        "type": "Next-Day",
        "amount": 15,
        "description": "Next day delivery"
      },
      {
        "type": "Express",
        "amount": 35,
        "description": "Express delivery (1-2 hours)"
      },
      {
        "type": "Scheduled",
        "amount": 20,
        "description": "Scheduled delivery"
      }
    ]
  },
  "meta": {}
}
```

---

## 5. Admin Approve Pick Drop Request

### Request
```
PUT {{baseUrl}}/api/pick-drops/{{pickDropId}}/approve
```

**Headers:**
```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "subtotal": 75.50,
  "adminNotes": "Approved for same-day delivery. High priority package."
}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and small electronics package",
    "itemWeight": 2.5,
    "preferredPickupTime": "2024-01-15T10:00:00.000Z",
    "pickDropStatus": "Confirmed",
    "deliveryType": "Same-Day",
    "scheduledDateTime": "2024-01-15T15:00:00.000Z",
    "subtotal": 75.5,
    "deliveryFee": 25,
    "totalAmount": 100.5,
    "adminNotes": "Approved for same-day delivery. High priority package.",
    "approvedAt": "2024-01-15T09:15:00.000Z",
    "approvedBy": {
      "id": 2,
      "username": "admin",
      "email": "admin@example.com"
    },
    "assignedRider": null,
    "pickupLocation": {
      "id": 1,
      "address": "123 Business Bay Tower",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "12345"
    },
    "dropoffLocation": {
      "id": 2,
      "address": "456 Marina Walk",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "54321"
    },
    "images": [],
    "users_permissions_user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T09:15:00.000Z",
    "publishedAt": "2024-01-15T08:30:00.000Z"
  },
  "meta": {}
}
```

---

## 6. Get Pick Drop Details

### Request
```
GET {{baseUrl}}/api/pick-drops/{{pickDropId}}
```

**Headers:**
```
Authorization: Bearer {{userToken}}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and small electronics package",
    "itemWeight": 2.5,
    "preferredPickupTime": "2024-01-15T10:00:00.000Z",
    "pickDropStatus": "Confirmed",
    "deliveryType": "Same-Day",
    "scheduledDateTime": "2024-01-15T15:00:00.000Z",
    "subtotal": 75.5,
    "deliveryFee": 25,
    "totalAmount": 100.5,
    "adminNotes": "Approved for same-day delivery. High priority package.",
    "approvedAt": "2024-01-15T09:15:00.000Z",
    "approvedBy": {
      "id": 2,
      "username": "admin",
      "email": "admin@example.com"
    },
    "assignedRider": null,
    "pickupLocation": {
      "id": 1,
      "address": "123 Business Bay Tower",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "12345"
    },
    "dropoffLocation": {
      "id": 2,
      "address": "456 Marina Walk",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "54321"
    },
    "images": [],
    "users_permissions_user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "pricingBreakdown": {
      "subtotal": 75.5,
      "deliveryFee": 25,
      "totalAmount": 100.5
    },
    "availableDeliveryOptions": [
      {
        "type": "Standard",
        "amount": 10,
        "description": "Standard delivery (2-5 business days)"
      },
      {
        "type": "Same-Day",
        "amount": 25,
        "description": "Same day delivery"
      },
      {
        "type": "Next-Day",
        "amount": 15,
        "description": "Next day delivery"
      },
      {
        "type": "Express",
        "amount": 35,
        "description": "Express delivery (1-2 hours)"
      },
      {
        "type": "Scheduled",
        "amount": 20,
        "description": "Scheduled delivery"
      }
    ],
    "canUpdateDeliveryType": true,
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T09:15:00.000Z",
    "publishedAt": "2024-01-15T08:30:00.000Z"
  },
  "meta": {}
}
```

---

## 7. Update Delivery Type

### Request
```
PUT {{baseUrl}}/api/pick-drops/{{pickDropId}}/delivery-type
```

**Headers:**
```
Authorization: Bearer {{userToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "deliveryType": "Express"
}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and small electronics package",
    "itemWeight": 2.5,
    "preferredPickupTime": "2024-01-15T10:00:00.000Z",
    "pickDropStatus": "Confirmed",
    "deliveryType": "Express",
    "scheduledDateTime": "2024-01-15T15:00:00.000Z",
    "subtotal": 75.5,
    "deliveryFee": 35,
    "totalAmount": 110.5,
    "adminNotes": "Approved for same-day delivery. High priority package.",
    "approvedAt": "2024-01-15T09:15:00.000Z",
    "approvedBy": {
      "id": 2,
      "username": "admin",
      "email": "admin@example.com"
    },
    "assignedRider": null,
    "pickupLocation": {
      "id": 1,
      "address": "123 Business Bay Tower",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "12345"
    },
    "dropoffLocation": {
      "id": 2,
      "address": "456 Marina Walk",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "54321"
    },
    "images": [],
    "users_permissions_user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T09:45:00.000Z",
    "publishedAt": "2024-01-15T08:30:00.000Z"
  },
  "meta": {}
}
```

---

## 8. Update Status (Admin)

### Request
```
PUT {{baseUrl}}/api/pick-drops/{{pickDropId}}/status
```

**Headers:**
```
Authorization: Bearer {{adminToken}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "status": "In Transit",
  "assignedRider": "RIDER_001"
}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and small electronics package",
    "itemWeight": 2.5,
    "preferredPickupTime": "2024-01-15T10:00:00.000Z",
    "pickDropStatus": "In Transit",
    "deliveryType": "Express",
    "scheduledDateTime": "2024-01-15T15:00:00.000Z",
    "subtotal": 75.5,
    "deliveryFee": 35,
    "totalAmount": 110.5,
    "adminNotes": "Approved for same-day delivery. High priority package.",
    "approvedAt": "2024-01-15T09:15:00.000Z",
    "approvedBy": {
      "id": 2,
      "username": "admin",
      "email": "admin@example.com"
    },
    "assignedRider": "RIDER_001",
    "pickupLocation": {
      "id": 1,
      "address": "123 Business Bay Tower",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "12345"
    },
    "dropoffLocation": {
      "id": 2,
      "address": "456 Marina Walk",
      "city": "Dubai",
      "state": "Dubai",
      "zipCode": "54321"
    },
    "images": [],
    "users_permissions_user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "publishedAt": "2024-01-15T08:30:00.000Z"
  },
  "meta": {}
}
```

---

## 9. Get All Pick Drop Requests (Admin)

### Request
```
GET {{baseUrl}}/api/pick-drops?status=Confirmed&page=1&pageSize=10&sort=createdAt:desc
```

**Headers:**
```
Authorization: Bearer {{adminToken}}
```

### Expected Response (200 OK)
```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "documentId": "abc123def456",
        "senderName": "John Doe",
        "receiverName": "Jane Smith",
        "itemDescription": "Important documents and small electronics package",
        "pickDropStatus": "In Transit",
        "deliveryType": "Express",
        "subtotal": 75.5,
        "deliveryFee": 35,
        "totalAmount": 110.5,
        "assignedRider": "RIDER_001",
        "approvedAt": "2024-01-15T09:15:00.000Z",
        "users_permissions_user": {
          "id": 1,
          "username": "testuser",
          "email": "test@example.com"
        },
        "approvedBy": {
          "id": 2,
          "username": "admin",
          "email": "admin@example.com"
        },
        "createdAt": "2024-01-15T08:30:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 1,
      "total": 1
    }
  },
  "meta": {}
}
```

---

## Error Response Examples

### 400 Bad Request
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Delivery type is required",
    "details": {}
  }
}
```

### 401 Unauthorized
```json
{
  "data": null,
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "You must be logged in",
    "details": {}
  }
}
```

### 403 Forbidden
```json
{
  "data": null,
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Only administrators can approve pick-drop requests",
    "details": {}
  }
}
```

### 404 Not Found
```json
{
  "data": null,
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Pick-drop request not found",
    "details": {}
  }
}
```

---

## Postman Collection Import

You can create a Postman collection with these requests. Here's a sample collection structure:

```json
{
  "info": {
    "name": "Pick Drop Request API",
    "description": "Complete API tests for Pick Drop Request functionality"
  },
  "item": [
    {
      "name": "User Endpoints",
      "item": [
        {
          "name": "Create Pick Drop Request",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{userToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "url": "{{baseUrl}}/api/pick-drops"
          }
        }
      ]
    },
    {
      "name": "Admin Endpoints",
      "item": [
        {
          "name": "Approve Pick Drop Request",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": "{{baseUrl}}/api/pick-drops/{{pickDropId}}/approve"
          }
        }
      ]
    }
  ]
}
```

## Testing Flow

1. **Create a pick drop request** (subtotal = 0, delivery fee calculated)
2. **Get my requests** to see the pending request
3. **Admin approves** and sets subtotal
4. **Get details** to see updated pricing
5. **Update delivery type** to see recalculated totals
6. **Admin updates status** to track progress

This comprehensive test suite covers all the functionality with realistic data and expected responses.
