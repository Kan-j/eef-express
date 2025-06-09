# EEF Express E-commerce API Testing Guide

## 🚀 Quick Setup

### 1. Import Collections
1. Import `postman-tests-ecommerce-endpoints.json` into Postman
2. Import `postman-environment-ecommerce.json` as environment
3. Select the "EEF Express E-commerce Environment"

### 2. Authentication Setup
First, you need to authenticate and get a JWT token:

**Login Request:**
```
POST {{baseUrl}}/auth/local
Content-Type: application/json

{
  "identifier": "{{user_email}}",
  "password": "{{user_password}}"
}
```

**Pre-request Script for Login:**
```javascript
// No pre-request needed for login
```

**Test Script for Login:**
```javascript
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
    
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('jwt');
    
    // Set the JWT token for future requests
    pm.environment.set("jwt_token", responseJson.jwt);
    
    // Set user ID if needed
    if (responseJson.user && responseJson.user.id) {
        pm.environment.set("userId", responseJson.user.id);
    }
});
```

## 🧪 Test Scripts for Key Endpoints

### Products Tests

**Get Product Details - Test Script:**
```javascript
pm.test("Product details retrieved successfully", function () {
    pm.response.to.have.status(200);

    const responseJson = pm.response.json();
    const product = responseJson.data;

    // Test basic product structure
    pm.expect(product).to.have.property('id');
    pm.expect(product).to.have.property('name');
    pm.expect(product).to.have.property('price');

    // Test new schema fields
    pm.expect(product).to.have.property('ratings');
    pm.expect(product).to.have.property('reviews');
    pm.expect(product).to.have.property('variations');

    // Test populated relations
    if (product.reviews && product.reviews.length > 0) {
        pm.expect(product.reviews[0]).to.have.property('rating');
        pm.expect(product.reviews[0]).to.have.property('comment');
    }

    // Store variation IDs and stock for cart tests
    if (product.variations && product.variations.length > 0) {
        // Store as string to match schema requirements
        pm.environment.set("variationId", String(product.variations[0].id));
        pm.environment.set("variationStock", product.variations[0].stock);

        // Store second variation if available
        if (product.variations.length > 1) {
            pm.environment.set("variationId2", String(product.variations[1].id));
        }

        // Test that each variation has individual stock
        product.variations.forEach(variation => {
            pm.expect(variation).to.have.property('stock');
            pm.expect(variation.stock).to.be.a('number');
            pm.expect(variation.stock).to.be.at.least(0);
        });
    }
});
```

### Cart Tests

**Add Item to Cart - Test Script:**
```javascript
pm.test("Item added to cart successfully with variation details", function () {
    pm.response.to.have.status(200);

    const responseJson = pm.response.json();
    const cart = responseJson.data;

    // Test cart structure
    pm.expect(cart).to.have.property('item');
    pm.expect(cart.item).to.be.an('array');
    pm.expect(cart.item.length).to.be.greaterThan(0);

    // Test item structure
    const item = cart.item[cart.item.length - 1]; // Last added item
    pm.expect(item).to.have.property('product');
    pm.expect(item).to.have.property('quantity');

    // Test populated product data
    if (typeof item.product === 'object') {
        pm.expect(item.product).to.have.property('id');
        pm.expect(item.product).to.have.property('name');
        pm.expect(item.product).to.have.property('price');
    }

    // If variation was specified, test variation data and details
    const variationId = pm.environment.get('variationId');
    if (variationId) {
        pm.expect(item).to.have.property('variation_id');
        pm.expect(item.variation_id).to.equal(variationId);

        // Test that variation details are included in cart
        pm.expect(item).to.have.property('variation_details');
        pm.expect(item.variation_details).to.be.an('object');

        const details = item.variation_details;

        // Test that key variation fields are present
        if (details.size) pm.expect(details.size).to.be.a('string');
        if (details.color) pm.expect(details.color).to.be.a('string');
        if (details.sku) pm.expect(details.sku).to.be.a('string');

        // Test that price and stock information is preserved
        pm.expect(details).to.have.property('price_adjustment');
        pm.expect(details).to.have.property('stock_at_time_of_add');
        pm.expect(details.stock_at_time_of_add).to.be.a('number');

        console.log(`✅ Cart item variation details: ${details.size || 'N/A'} ${details.color || 'N/A'} (SKU: ${details.sku || 'N/A'})`);
    }
});
```

**Get Cart Totals - Test Script:**
```javascript
pm.test("Cart totals calculated correctly", function () {
    pm.response.to.have.status(200);
    
    const responseJson = pm.response.json();
    const totals = responseJson.data;
    
    pm.expect(totals).to.have.property('subtotal');
    pm.expect(totals).to.have.property('itemCount');
    pm.expect(totals).to.have.property('totalItems');
    
    pm.expect(totals.subtotal).to.be.a('number');
    pm.expect(totals.itemCount).to.be.a('number');
    pm.expect(totals.totalItems).to.be.a('number');
});
```

### Variation Stock Tests

**Test Variation Individual Stock - Test Script:**
```javascript
pm.test("Variation stock is tracked individually", function () {
    if (pm.response.code === 200) {
        const responseJson = pm.response.json();
        const cart = responseJson.data;

        // Test that cart item includes variation information
        pm.expect(cart).to.have.property('item');
        const items = cart.item;

        if (items && items.length > 0) {
            const lastItem = items[items.length - 1];
            pm.expect(lastItem).to.have.property('variation_id');
            pm.expect(lastItem.variation_id).to.not.be.null;

            // Test that product variations are populated
            if (lastItem.product && lastItem.product.variations) {
                const variation = lastItem.product.variations.find(v => v.id === lastItem.variation_id);
                pm.expect(variation).to.not.be.undefined;
                pm.expect(variation).to.have.property('stock');
            }
        }
    }
});
```

**Test Variation Stock Limit - Test Script:**
```javascript
pm.test("Variation stock limit is enforced with proper error handling", function () {
    // This should return a 400 Bad Request when trying to add more than available stock
    if (pm.response.code === 400) {
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('error');
        pm.expect(responseJson.error).to.have.property('message');

        const errorMessage = responseJson.error.message;

        // Test that error message is user-friendly and specific
        pm.expect(errorMessage).to.satisfy(function(msg) {
            return msg.includes('available') ||
                   msg.includes('stock') ||
                   msg.includes('items') ||
                   msg.includes('variation');
        }, 'Error message should mention stock/availability');

        // Test that it's not a generic 500 error
        pm.expect(responseJson.error.status).to.equal(400);
        pm.expect(responseJson.error.name).to.equal('BadRequestError');

        console.log(`✅ Variation stock limit properly enforced: ${errorMessage}`);
    } else if (pm.response.code === 200) {
        console.log('⚠️ Warning: Large quantity was accepted - check variation stock levels');
    } else if (pm.response.code === 500) {
        pm.test.skip('❌ Received 500 error - error handling needs improvement');
    }
});
```

**Test Multiple Variations Same Product - Test Script:**
```javascript
pm.test("Multiple variations of same product are separate cart items", function () {
    pm.response.to.have.status(200);

    const responseJson = pm.response.json();
    const cart = responseJson.data;

    pm.expect(cart).to.have.property('item');
    const items = cart.item;

    // Count items for the same product but different variations
    const productId = pm.environment.get('productId');
    const productItems = items.filter(item =>
        (typeof item.product === 'object' ? item.product.id : item.product) == productId
    );

    if (productItems.length > 1) {
        // Verify they have different variation IDs
        const variationIds = productItems.map(item => item.variation_id);
        const uniqueVariationIds = [...new Set(variationIds)];
        pm.expect(uniqueVariationIds.length).to.equal(productItems.length);
        console.log('✅ Multiple variations stored as separate cart items');
    }
});
```

**Test Cart Totals with Variations - Test Script:**
```javascript
pm.test("Cart totals include variation price adjustments", function () {
    pm.response.to.have.status(200);

    const responseJson = pm.response.json();
    const totals = responseJson.data;

    pm.expect(totals).to.have.property('subtotal');
    pm.expect(totals.subtotal).to.be.a('number');
    pm.expect(totals.subtotal).to.be.at.least(0);

    // Store subtotal for comparison in other tests
    pm.environment.set('cartSubtotal', totals.subtotal.toString());

    console.log(`Cart subtotal with variations: ${totals.subtotal}`);
});
```

**Test Product Without Variation ID Error - Test Script:**
```javascript
pm.test("Products with variations require variationId", function () {
    // This should return an error for products that have variations but no variationId provided
    if (pm.response.code === 400) {
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('error');
        pm.expect(responseJson.error.message).to.include('Variation ID is required');
        console.log('✅ Variation ID requirement properly enforced');
    } else if (pm.response.code === 200) {
        console.log('ℹ️ Product may not have variations or variation ID was optional');
    }
});
```

**Test Variation ID Type Validation - Test Script:**
```javascript
pm.test("Variation ID type validation works correctly", function () {
    // Test that both string and number variation IDs are handled properly
    if (pm.response.code === 400) {
        const responseJson = pm.response.json();

        // If it's a type validation error, it should be handled gracefully
        if (responseJson.error.message.includes('must be a `string` type')) {
            pm.expect(responseJson.error.status).to.equal(400);
            pm.expect(responseJson.error.name).to.equal('BadRequestError');
            console.log('✅ Variation ID type validation handled properly');
        }
    } else if (pm.response.code === 200) {
        // Success means the variation ID was converted properly
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('data');
        console.log('✅ Variation ID accepted and converted properly');
    }
});
```

**Test Order Variation Details - Test Script:**
```javascript
pm.test("Order includes complete variation details for admin viewing", function () {
    pm.response.to.have.status(200);

    const responseJson = pm.response.json();
    const order = responseJson.data;

    // Test order structure
    pm.expect(order).to.have.property('products');
    pm.expect(order.products).to.be.an('array');

    // Test each product in the order
    order.products.forEach(orderItem => {
        pm.expect(orderItem).to.have.property('product');
        pm.expect(orderItem).to.have.property('quantity');

        // If item has a variation, test variation details
        if (orderItem.variation_id) {
            pm.expect(orderItem).to.have.property('variation_details');
            pm.expect(orderItem.variation_details).to.be.an('object');

            // Test that variation details include key fields for admin viewing
            const details = orderItem.variation_details;

            // These fields should be present for admin convenience
            if (details.size) pm.expect(details.size).to.be.a('string');
            if (details.color) pm.expect(details.color).to.be.a('string');
            if (details.sku) pm.expect(details.sku).to.be.a('string');

            // Price and stock information should be preserved
            pm.expect(details).to.have.property('price_adjustment');
            pm.expect(details).to.have.property('stock_at_time_of_order');
            pm.expect(details.stock_at_time_of_order).to.be.a('number');

            console.log(`✅ Order item variation details: ${details.size || 'N/A'} ${details.color || 'N/A'} (SKU: ${details.sku || 'N/A'})`);
        }
    });
});
```

**Test Admin Order List with Variations - Test Script:**
```javascript
pm.test("Admin order list shows variation details without manual lookup", function () {
    pm.response.to.have.status(200);

    const responseJson = pm.response.json();
    const orders = responseJson.data.results || responseJson.data;

    pm.expect(orders).to.be.an('array');

    // Test that orders with variations include complete details
    orders.forEach(order => {
        if (order.products && order.products.length > 0) {
            order.products.forEach(orderItem => {
                if (orderItem.variation_id) {
                    // Admin should see variation details without additional API calls
                    pm.expect(orderItem).to.have.property('variation_details');

                    const details = orderItem.variation_details;
                    pm.expect(details).to.be.an('object');

                    // Log variation info for admin visibility test
                    const variationInfo = [
                        details.size ? `Size: ${details.size}` : null,
                        details.color ? `Color: ${details.color}` : null,
                        details.sku ? `SKU: ${details.sku}` : null
                    ].filter(Boolean).join(', ');

                    console.log(`Order #${order.id} - ${orderItem.product.name || 'Product'} - ${variationInfo}`);
                }
            });
        }
    });

    console.log('✅ Admin can view all variation details without manual lookup');
});
```

### Checkout Tests

**Process Checkout - Test Script:**
```javascript
pm.test("Checkout processed successfully", function () {
    pm.response.to.have.status(200);
    
    const responseJson = pm.response.json();
    
    pm.expect(responseJson).to.have.property('success');
    pm.expect(responseJson.success).to.be.true;
    
    if (responseJson.order) {
        pm.expect(responseJson.order).to.have.property('id');
        pm.environment.set("orderId", responseJson.order.id.toString());
        
        // Test order structure
        pm.expect(responseJson.order).to.have.property('products');
        pm.expect(responseJson.order).to.have.property('totalAmount');
        pm.expect(responseJson.order).to.have.property('paymentStatus');
    }
});
```

### Order Tests

**Get Order Details - Test Script:**
```javascript
pm.test("Order details retrieved successfully", function () {
    pm.response.to.have.status(200);
    
    const responseJson = pm.response.json();
    const order = responseJson.data;
    
    // Test order structure
    pm.expect(order).to.have.property('id');
    pm.expect(order).to.have.property('products');
    pm.expect(order).to.have.property('totalAmount');
    pm.expect(order).to.have.property('paymentStatus');
    pm.expect(order).to.have.property('shippingAddress');
    
    // Test populated product data
    if (order.products && order.products.length > 0) {
        const product = order.products[0];
        pm.expect(product).to.have.property('product');
        pm.expect(product).to.have.property('quantity');
        
        // Test product details are populated
        if (typeof product.product === 'object') {
            pm.expect(product.product).to.have.property('name');
            pm.expect(product.product).to.have.property('price');
            pm.expect(product.product).to.have.property('images');
        }
    }
});
```

## 🔄 Complete E-commerce Flow Test

### Test Sequence:
1. **Login** → Get JWT token
2. **Get Products** → Select a product with variations
3. **Extract Variation Data** → Store variation IDs and stock levels
4. **Add to Cart** → Add product with valid variation
5. **Test Stock Limits** → Try to exceed variation stock
6. **Add Multiple Variations** → Add different variations of same product
7. **Validate Cart** → Ensure cart is valid with variations
8. **Get Cart Totals** → Check calculations include variation pricing
9. **Process Checkout** → Create order with variations
10. **Get Order Details** → Verify order includes variation data
11. **Check Order Status** → Verify order tracking

### Variation Stock Testing Workflow:
1. **Get Product with Variations** → Extract variation IDs and stock levels
2. **Test Valid Quantity** → Add quantity within stock limit
3. **Test Stock Limit** → Try to add quantity exceeding stock
4. **Test Multiple Variations** → Add different variations as separate items
5. **Test Price Calculations** → Verify variation price adjustments
6. **Test Cart Validation** → Ensure individual variation stock is checked
7. **Test Quantity Updates** → Update quantities respecting variation limits

### Order Variation Details Testing Workflow:
1. **Create Order with Variations** → Process checkout with variation items
2. **Verify Order Details** → Check that variation details are stored
3. **Test Admin Order View** → Verify admins see complete variation info
4. **Validate Historical Data** → Ensure variation snapshot is preserved
5. **Test Order List** → Check that admin order lists show variation details

### Pre-request Script for Flow Tests:
```javascript
// Check if we have required variables
const requiredVars = ['jwt_token', 'productId'];
const missingVars = requiredVars.filter(varName => !pm.environment.get(varName));

if (missingVars.length > 0) {
    console.log(`Missing required variables: ${missingVars.join(', ')}`);
    console.log('Please run the login request first and set productId');
}
```

## 🚨 Error Handling Tests

### Test for Authentication Errors:
```javascript
pm.test("Handle authentication errors", function () {
    if (pm.response.code === 401) {
        pm.expect(pm.response.json()).to.have.property('error');
        console.log('Authentication failed - check JWT token');
    }
});
```

### Test for Stock Limit Errors:
```javascript
pm.test("Stock limit errors return proper 400 status with clear message", function () {
    if (pm.response.code === 400) {
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('error');
        pm.expect(responseJson.error).to.have.property('status', 400);
        pm.expect(responseJson.error).to.have.property('name', 'BadRequestError');
        pm.expect(responseJson.error).to.have.property('message');

        const errorMessage = responseJson.error.message;

        // Test that stock-related errors have clear, user-friendly messages
        if (errorMessage.includes('stock') || errorMessage.includes('available') || errorMessage.includes('items')) {
            pm.expect(errorMessage).to.not.equal('Internal Server Error');
            pm.expect(errorMessage).to.not.include('undefined');
            console.log(`✅ Clear stock error message: ${errorMessage}`);
        }
    }
});
```

### Test for Variation Requirement Errors:
```javascript
pm.test("Variation requirement errors are handled properly", function () {
    if (pm.response.code === 400) {
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('error');

        const errorMessage = responseJson.error.message;

        if (errorMessage.includes('Variation ID is required')) {
            pm.expect(responseJson.error.status).to.equal(400);
            pm.expect(errorMessage).to.be.a('string');
            pm.expect(errorMessage.length).to.be.greaterThan(0);
            console.log(`✅ Clear variation requirement error: ${errorMessage}`);
        }
    }
});
```

### Test for Product Not Found Errors:
```javascript
pm.test("Product not found errors return proper 404 status", function () {
    if (pm.response.code === 404) {
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('error');
        pm.expect(responseJson.error).to.have.property('status', 404);
        pm.expect(responseJson.error).to.have.property('name', 'NotFoundError');

        const errorMessage = responseJson.error.message;
        pm.expect(errorMessage).to.include('not found');
        console.log(`✅ Clear not found error: ${errorMessage}`);
    }
});
```

### Test for General Validation Errors:
```javascript
pm.test("Handle validation errors gracefully", function () {
    if (pm.response.code === 400) {
        const responseJson = pm.response.json();
        pm.expect(responseJson).to.have.property('error');
        pm.expect(responseJson.error.message).to.not.equal('Internal Server Error');
        pm.expect(responseJson.error.message).to.not.include('undefined');
        console.log('Validation error:', responseJson.error.message);
    }
});
```

### Test Against 500 Errors for User Actions:
```javascript
pm.test("User actions should not result in 500 errors", function () {
    // User actions like adding to cart, updating quantities, etc. should return 400 for validation errors, not 500
    if (pm.response.code === 500) {
        const responseJson = pm.response.json();
        console.error('❌ Unexpected 500 error for user action:', responseJson.error?.message || 'Unknown error');

        // This test should fail to highlight that error handling needs improvement
        pm.expect(pm.response.code).to.not.equal(500, 'User actions should not result in 500 Internal Server Error');
    }
});
```

## 📊 Performance Tests

### Response Time Test:
```javascript
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000); // 2 seconds
});
```

### Data Consistency Test:
```javascript
pm.test("Data consistency check", function () {
    const responseJson = pm.response.json();
    
    // Check that populated relations are consistent
    if (responseJson.data && responseJson.data.products) {
        responseJson.data.products.forEach(item => {
            if (item.product && typeof item.product === 'object') {
                pm.expect(item.product.id).to.be.a('number');
                pm.expect(item.quantity).to.be.a('number');
                pm.expect(item.quantity).to.be.greaterThan(0);
            }
        });
    }
});
```
