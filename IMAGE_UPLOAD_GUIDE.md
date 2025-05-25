# Image Upload Guide for Pick Drop Requests

## Overview

The Pick Drop Request functionality supports image uploads for documenting items to be delivered. Images must be uploaded **first** using Strapi's built-in upload endpoint, then the returned file IDs are used when creating the pick drop request.

## Image Upload Process

### Step 1: Upload Images

**Endpoint:** `POST /api/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (Form Data):**
```
files: [file1.jpg, file2.jpg, file3.jpg]
```

### Step 2: Use Image IDs in Pick Drop Request

**Endpoint:** `POST /api/pick-drops`

**Body (JSON):**
```json
{
  "senderName": "John Doe",
  "senderContact": "+971501234567",
  "receiverName": "Jane Smith",
  "receiverContact": "+971507654321",
  "itemDescription": "Documents and electronics",
  "itemWeight": 2.5,
  "deliveryType": "Same-Day",
  "images": [1, 2, 3]
}
```

## Postman Tests with Image Upload

### Test 1: Upload Images

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
Value: [Select your image files]
```

**Expected Response:**
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
        "hash": "thumbnail_abc123",
        "ext": ".jpg",
        "mime": "image/jpeg",
        "width": 245,
        "height": 138,
        "size": 8.5,
        "url": "/uploads/thumbnail_package_photo_1_abc123.jpg"
      },
      "small": {
        "name": "small_package-photo-1.jpg",
        "hash": "small_abc123",
        "ext": ".jpg",
        "mime": "image/jpeg",
        "width": 500,
        "height": 281,
        "size": 25.2,
        "url": "/uploads/small_package_photo_1_abc123.jpg"
      }
    },
    "hash": "package_photo_1_abc123",
    "ext": ".jpg",
    "mime": "image/jpeg",
    "size": 245.6,
    "url": "/uploads/package_photo_1_abc123.jpg",
    "previewUrl": null,
    "provider": "local",
    "provider_metadata": null,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": 2,
    "name": "package-photo-2.jpg",
    "url": "/uploads/package_photo_2_def456.jpg",
    "createdAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": 3,
    "name": "package-photo-3.jpg", 
    "url": "/uploads/package_photo_3_ghi789.jpg",
    "createdAt": "2024-01-15T08:00:00.000Z"
  }
]
```

### Test 2: Create Pick Drop Request with Images

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
  "itemDescription": "Important documents and small electronics package with photos for verification",
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
  "images": [1, 2, 3]
}
```

**Expected Response:**
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123def456",
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and small electronics package with photos for verification",
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
      },
      {
        "id": 3,
        "name": "package-photo-3.jpg",
        "url": "/uploads/package_photo_3_ghi789.jpg",
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

## Image Validation

The system validates images in several ways:

### 1. Image ID Validation
- All image IDs must be positive integers
- Image IDs must correspond to existing uploaded files

### 2. File Existence Check
- Each image ID is verified against the upload database
- Non-existent files will cause request rejection

### 3. Error Responses

**Invalid Image IDs:**
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Invalid image IDs provided: abc, xyz. Images must be uploaded first using the upload endpoint.",
    "details": {}
  }
}
```

**Non-existent Files:**
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Image with ID 999 not found. Please upload the image first.",
    "details": {}
  }
}
```

## Frontend Implementation Guide

### JavaScript/React Example

```javascript
// Step 1: Upload images
const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const uploadedFiles = await response.json();
  return uploadedFiles.map(file => file.id);
};

// Step 2: Create pick drop request
const createPickDropRequest = async (requestData, imageIds) => {
  const response = await fetch('/api/pick-drops', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...requestData,
      images: imageIds
    })
  });

  return response.json();
};

// Usage
const handleSubmit = async (formData, selectedFiles) => {
  try {
    // Upload images first
    const imageIds = await uploadImages(selectedFiles);
    
    // Create request with image IDs
    const result = await createPickDropRequest(formData, imageIds);
    
    console.log('Pick drop request created:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Image Schema Configuration

The pick-drop schema is already configured to handle images:

```json
{
  "images": {
    "type": "media",
    "multiple": true,
    "required": false,
    "allowedTypes": [
      "images",
      "files",
      "videos",
      "audios"
    ]
  }
}
```

## Best Practices

### 1. Image Size Limits
- Recommended max file size: 5MB per image
- Recommended max total: 20MB per request
- Supported formats: JPG, PNG, GIF, WebP

### 2. Image Optimization
- Use compressed images for faster uploads
- Consider using thumbnail versions for list views
- Strapi automatically generates thumbnails and small versions

### 3. Error Handling
- Always validate upload response before using IDs
- Handle network errors gracefully
- Provide user feedback during upload process

### 4. Security
- Images are validated server-side
- Only authenticated users can upload
- File type validation is enforced

## Testing Checklist

- [ ] Upload single image successfully
- [ ] Upload multiple images successfully  
- [ ] Create pick drop request with images
- [ ] Create pick drop request without images
- [ ] Handle invalid image IDs
- [ ] Handle non-existent image IDs
- [ ] Verify image URLs in response
- [ ] Test image display in frontend

## Common Issues & Solutions

### Issue: "Invalid image IDs provided"
**Solution:** Ensure you're passing the numeric IDs returned from the upload endpoint, not file names or other values.

### Issue: "Image with ID X not found"
**Solution:** Verify the upload was successful and use the correct ID from the upload response.

### Issue: Images not displaying
**Solution:** Check that the image URLs are correctly formed and accessible. Strapi serves uploaded files from `/uploads/` by default.

### Issue: Upload fails
**Solution:** Check file size limits, authentication token, and network connectivity.

This comprehensive guide covers all aspects of image upload handling for the Pick Drop Request functionality!
