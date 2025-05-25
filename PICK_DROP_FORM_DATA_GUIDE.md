# Pick Drop Request with Form Data & Direct Image Upload

## 🎯 **New Approach: Single Request with Form Data**

The Pick Drop Request API now supports **direct image upload** using form data in a single request. No need for separate upload steps!

## 📋 **API Endpoint**

```
POST /api/pick-drops
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

## 🔧 **Form Data Fields**

### **Required Text Fields:**
- `senderName` - Name of the sender
- `senderContact` - Phone number of sender
- `receiverName` - Name of the receiver
- `receiverContact` - Phone number of receiver
- `itemDescription` - Description of items to be delivered
- `itemWeight` - Weight in kg (as string, e.g., "2.5")

### **Optional Text Fields:**
- `deliveryType` - Standard, Same-Day, Next-Day, Express, Scheduled
- `preferredPickupTime` - ISO datetime string
- `scheduledDateTime` - ISO datetime string (for scheduled delivery)

### **Address Fields:**
- `senderAddressLine1` - Primary sender address (required)
- `senderAddressLine2` - Secondary sender address (optional)
- `receiverAddressLine1` - Primary receiver address (required)
- `receiverAddressLine2` - Secondary receiver address (optional)

### **File Fields:**
- `images` - Multiple image files (optional)

## 🧪 **Postman Test Examples**

### **Example 1: With Images**

**Request:**
```
POST {{baseUrl}}/api/pick-drops
Authorization: Bearer {{userToken}}
Content-Type: multipart/form-data
```

**Form Data:**
```
senderName: John Doe
senderContact: +971501234567
receiverName: Jane Smith
receiverContact: +971507654321
itemDescription: Important documents and electronics
itemWeight: 2.5
deliveryType: Same-Day
preferredPickupTime: 2024-01-15T10:00:00Z
scheduledDateTime: 2024-01-15T15:00:00Z
senderAddressLine1: 123 Business Bay Tower, Floor 15
senderAddressLine2: Dubai Marina District
receiverAddressLine1: 456 Marina Walk, Apartment 2A
receiverAddressLine2: JBR Beach Area
images: [Select Files: package-photo-1.jpg, package-photo-2.jpg]
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "senderName": "John Doe",
    "senderContact": "+971501234567",
    "receiverName": "Jane Smith",
    "receiverContact": "+971507654321",
    "itemDescription": "Important documents and electronics",
    "itemWeight": 2.5,
    "pickDropStatus": "Pending",
    "deliveryType": "Same-Day",
    "subtotal": 0,
    "deliveryFee": 25,
    "totalAmount": 25,
    "images": [
      {
        "id": 1,
        "name": "package-photo-1.jpg",
        "url": "/uploads/package_photo_1_abc123.jpg",
        "formats": {
          "thumbnail": {
            "url": "/uploads/thumbnail_package_photo_1_abc123.jpg"
          }
        }
      },
      {
        "id": 2,
        "name": "package-photo-2.jpg",
        "url": "/uploads/package_photo_2_def456.jpg"
      }
    ],
    "senderAddressLine1": "123 Business Bay Tower, Floor 15",
    "senderAddressLine2": "Dubai Marina District",
    "receiverAddressLine1": "456 Marina Walk, Apartment 2A",
    "receiverAddressLine2": "JBR Beach Area",
    "users_permissions_user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "createdAt": "2024-01-15T08:30:00.000Z"
  }
}
```

### **Example 2: Without Images**

**Form Data:**
```
senderName: Alice Johnson
senderContact: +971509876543
receiverName: Bob Wilson
receiverContact: +971501122334
itemDescription: Documents only - no photos needed
itemWeight: 0.5
deliveryType: Standard
preferredPickupTime: 2024-01-16T14:00:00Z
senderAddressLine1: 789 Downtown Office Building
senderAddressLine2: Business District
receiverAddressLine1: 321 Residential Complex
receiverAddressLine2: Al Barsha Area
```

## 🔄 **How It Works Behind the Scenes**

1. **Form Data Processing** - Controller extracts text fields and files
2. **Image Upload** - Files are automatically uploaded using Strapi's upload service
3. **JSON Parsing** - Location fields are parsed from JSON strings
4. **Data Preparation** - All data is prepared for the service layer
5. **Request Creation** - Pick drop request is created with uploaded image IDs

## 💻 **Frontend Implementation**

### **JavaScript/React Example**

```javascript
const createPickDropRequest = async (formData, imageFiles) => {
  const form = new FormData();

  // Add text fields
  form.append('senderName', formData.senderName);
  form.append('senderContact', formData.senderContact);
  form.append('receiverName', formData.receiverName);
  form.append('receiverContact', formData.receiverContact);
  form.append('itemDescription', formData.itemDescription);
  form.append('itemWeight', formData.itemWeight.toString());
  form.append('deliveryType', formData.deliveryType);
  form.append('preferredPickupTime', formData.preferredPickupTime);

  // Add location data as JSON strings
  form.append('pickupLocation', JSON.stringify(formData.pickupLocation));
  form.append('dropoffLocation', JSON.stringify(formData.dropoffLocation));

  // Add image files
  imageFiles.forEach(file => {
    form.append('images', file);
  });

  const response = await fetch('/api/pick-drops', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type - let browser set it with boundary
    },
    body: form
  });

  return response.json();
};

// Usage
const handleSubmit = async (formData, selectedFiles) => {
  try {
    const result = await createPickDropRequest(formData, selectedFiles);
    console.log('Pick drop request created:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### **HTML Form Example**

```html
<form id="pickDropForm" enctype="multipart/form-data">
  <!-- Text Fields -->
  <input type="text" name="senderName" placeholder="Sender Name" required>
  <input type="tel" name="senderContact" placeholder="+971501234567" required>
  <input type="text" name="receiverName" placeholder="Receiver Name" required>
  <input type="tel" name="receiverContact" placeholder="+971507654321" required>
  <textarea name="itemDescription" placeholder="Item Description" required></textarea>
  <input type="number" name="itemWeight" step="0.1" placeholder="Weight (kg)" required>

  <!-- Delivery Options -->
  <select name="deliveryType">
    <option value="Standard">Standard</option>
    <option value="Same-Day">Same-Day</option>
    <option value="Next-Day">Next-Day</option>
    <option value="Express">Express</option>
    <option value="Scheduled">Scheduled</option>
  </select>

  <!-- Location Fields (will be converted to JSON) -->
  <input type="text" name="pickupAddress" placeholder="Pickup Address">
  <input type="text" name="pickupCity" placeholder="Pickup City">

  <input type="text" name="dropoffAddress" placeholder="Dropoff Address">
  <input type="text" name="dropoffCity" placeholder="Dropoff City">

  <!-- Image Upload -->
  <input type="file" name="images" multiple accept="image/*">

  <button type="submit">Create Pick Drop Request</button>
</form>

<script>
document.getElementById('pickDropForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  // Convert location fields to JSON
  const pickupLocation = {
    address: formData.get('pickupAddress'),
    city: formData.get('pickupCity'),
    state: 'Dubai',
    zipCode: '12345'
  };

  const dropoffLocation = {
    address: formData.get('dropoffAddress'),
    city: formData.get('dropoffCity'),
    state: 'Dubai',
    zipCode: '54321'
  };

  // Remove individual location fields and add JSON versions
  formData.delete('pickupAddress');
  formData.delete('pickupCity');
  formData.delete('dropoffAddress');
  formData.delete('dropoffCity');

  formData.append('pickupLocation', JSON.stringify(pickupLocation));
  formData.append('dropoffLocation', JSON.stringify(dropoffLocation));

  // Submit form
  try {
    const response = await fetch('/api/pick-drops', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
});
</script>
```

## ✅ **Advantages of Form Data Approach**

1. **Single Request** - No need for separate image upload step
2. **User Friendly** - More intuitive for frontend developers
3. **Atomic Operation** - Either everything succeeds or fails together
4. **Better UX** - Users see immediate feedback
5. **Simpler Code** - Less complex frontend logic

## 🔍 **Validation & Error Handling**

### **Field Validation:**
- All required fields are validated
- Image files are automatically uploaded and validated
- JSON location fields are parsed and validated
- Weight is converted to float

### **Error Responses:**

**Missing Required Field:**
```json
{
  "error": {
    "status": 400,
    "message": "Sender name is required"
  }
}
```

**Image Upload Error:**
```json
{
  "error": {
    "status": 400,
    "message": "Error uploading images. Please try again."
  }
}
```

**Invalid JSON Location:**
```json
{
  "error": {
    "status": 400,
    "message": "Invalid pickup location format"
  }
}
```

## 🧪 **Testing Checklist**

- [ ] Create request with multiple images
- [ ] Create request without images
- [ ] Test all delivery types
- [ ] Test location JSON parsing
- [ ] Test weight conversion
- [ ] Test required field validation
- [ ] Test image upload errors
- [ ] Test large file uploads
- [ ] Test invalid file types

## 🚀 **Ready to Use!**

The updated Postman collection includes:
- Form data examples with file uploads
- Both with and without image scenarios
- Proper field formatting
- Automatic test scripts

Import the collection and start testing immediately! 🎉
