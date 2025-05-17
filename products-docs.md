# Product Endpoints Documentation

This document provides detailed information about all product-related endpoints in the EEF Express e-commerce API.

## Table of Contents

1. [Get All Products](#1-get-all-products-with-pagination-filters-and-search)
2. [Get Product Details](#2-get-product-details)
3. [Get Related Products](#3-get-related-products)
4. [Get Top-Rated Products](#4-get-top-rated-products)
5. [Get Newest Products](#5-get-newest-products)
6. [Technical Details](#technical-implementation-details)

## 1. Get All Products with Pagination, Filters, and Search

This endpoint allows you to retrieve a paginated list of products with various filtering options.

### Endpoint

```
GET /api/products
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | number | Page number for pagination | `page=1` |
| pageSize | number | Number of items per page | `pageSize=10` |
| sort | string | Field and direction to sort by | `sort=price:asc` |
| search | string | Search term for name or description | `search=shirt` |
| minPrice | number | Minimum price filter | `minPrice=10` |
| maxPrice | number | Maximum price filter | `maxPrice=100` |
| category | number | Category ID filter | `category=1` |
| inStock | boolean | Filter for products in stock | `inStock=true` |
| minRating | number | Minimum rating filter | `minRating=4` |

### Example Request

```http
GET /api/products?page=1&pageSize=10&sort=price:asc&search=shirt&minPrice=10&maxPrice=100&category=1&inStock=true&minRating=4
```

### Response

```json
{
  "data": {
    "results": [
      {
        "id": 1,
        "attributes": {
          "name": "Blue Shirt",
          "description": "A comfortable blue shirt",
          "price": 29.99,
          "stock": 10,
          "ratings": 4.5,
          "createdAt": "2023-05-15T10:00:00.000Z",
          "updatedAt": "2023-05-15T10:00:00.000Z",
          "publishedAt": "2023-05-15T10:00:00.000Z",
          "images": {
            "data": [
              {
                "id": 1,
                "attributes": {
                  "url": "/uploads/blue_shirt_1234.jpg"
                }
              }
            ]
          },
          "category": {
            "data": {
              "id": 1,
              "attributes": {
                "name": "Clothing"
              }
            }
          }
        }
      }
      // More products...
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 5,
      "total": 50
    }
  },
  "meta": {}
}
```

### Implementation References

- **Controller**: `src/api/product/controllers/product.ts` - `find` method
- **Service**: `src/api/product/services/product.ts` - `findProducts` method
- **Route**: `src/api/product/routes/product.ts` - `/products` route

## 2. Get Product Details

This endpoint retrieves detailed information about a specific product.

### Endpoint

```
GET /api/products/:id
```

### Path Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| id | number | Product ID | `/api/products/1` |

### Example Request

```http
GET /api/products/1
```

### Response

```json
{
  "data": {
    "id": 1,
    "attributes": {
      "name": "Blue Shirt",
      "description": "A comfortable blue shirt made from 100% cotton",
      "price": 29.99,
      "stock": 10,
      "ratings": 4.5,
      "createdAt": "2023-05-15T10:00:00.000Z",
      "updatedAt": "2023-05-15T10:00:00.000Z",
      "publishedAt": "2023-05-15T10:00:00.000Z",
      "images": {
        "data": [
          {
            "id": 1,
            "attributes": {
              "url": "/uploads/blue_shirt_1234.jpg"
            }
          }
        ]
      },
      "category": {
        "data": {
          "id": 1,
          "attributes": {
            "name": "Clothing"
          }
        }
      },
      "reviews": {
        "data": [
          {
            "id": 1,
            "attributes": {
              "content": "Great shirt, very comfortable!",
              "rating": 5
            }
          }
        ]
      }
    }
  },
  "meta": {}
}
```

### Implementation References

- **Controller**: `src/api/product/controllers/product.ts` - `findOne` method
- **Service**: `src/api/product/services/product.ts` - `getProductDetails` method
- **Route**: `src/api/product/routes/product.ts` - `/products/:id` route

## 3. Get Related Products

This endpoint retrieves products related to a specific product, based on the same category.

### Endpoint

```
GET /api/products/:id/related
```

### Path Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| id | number | Product ID | `/api/products/1/related` |

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| limit | number | Maximum number of related products to return | `limit=4` |

### Example Request

```http
GET /api/products/1/related?limit=4
```

### Response

```json
{
  "data": [
    {
      "id": 2,
      "attributes": {
        "name": "Red Shirt",
        "description": "A stylish red shirt",
        "price": 34.99,
        "stock": 8,
        "ratings": 4.2,
        "createdAt": "2023-05-15T10:00:00.000Z",
        "updatedAt": "2023-05-15T10:00:00.000Z",
        "publishedAt": "2023-05-15T10:00:00.000Z",
        "images": {
          "data": [
            {
              "id": 2,
              "attributes": {
                "url": "/uploads/red_shirt_5678.jpg"
              }
            }
          ]
        },
        "category": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "Clothing"
            }
          }
        }
      }
    }
    // More related products...
  ],
  "meta": {}
}
```

### Implementation References

- **Controller**: `src/api/product/controllers/product.ts` - `related` method
- **Service**: `src/api/product/services/product.ts` - `getRelatedProducts` method
- **Route**: `src/api/product/routes/product.ts` - `/products/:id/related` route

## 4. Get Top-Rated Products

This endpoint retrieves the top-rated products (products with ratings of 4 or higher).

### Endpoint

```
GET /api/products/top-rated
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| limit | number | Maximum number of products to return | `limit=5` |

### Example Request

```http
GET /api/products/top-rated?limit=5
```

### Response

```json
{
  "data": [
    {
      "id": 3,
      "attributes": {
        "name": "Premium Jacket",
        "description": "A high-quality jacket for all seasons",
        "price": 129.99,
        "stock": 5,
        "ratings": 4.9,
        "createdAt": "2023-05-15T10:00:00.000Z",
        "updatedAt": "2023-05-15T10:00:00.000Z",
        "publishedAt": "2023-05-15T10:00:00.000Z",
        "images": {
          "data": [
            {
              "id": 3,
              "attributes": {
                "url": "/uploads/premium_jacket_9012.jpg"
              }
            }
          ]
        },
        "category": {
          "data": {
            "id": 2,
            "attributes": {
              "name": "Outerwear"
            }
          }
        }
      }
    }
    // More top-rated products...
  ],
  "meta": {}
}
```

### Implementation References

- **Controller**: `src/api/product/controllers/product.ts` - `topRated` method
- **Service**: `src/api/product/services/product.ts` - `getTopRatedProducts` method
- **Route**: `src/api/product/routes/product.ts` - `/products/top-rated` route

## 5. Get Newest Products

This endpoint retrieves the newest products (most recently added products that are in stock).

### Endpoint

```
GET /api/products/newest
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| limit | number | Maximum number of products to return | `limit=5` |

### Example Request

```http
GET /api/products/newest?limit=5
```

### Response

```json
{
  "data": [
    {
      "id": 4,
      "attributes": {
        "name": "Designer Sunglasses",
        "description": "Stylish sunglasses with UV protection",
        "price": 89.99,
        "stock": 15,
        "ratings": 4.7,
        "createdAt": "2023-05-20T10:00:00.000Z",
        "updatedAt": "2023-05-20T10:00:00.000Z",
        "publishedAt": "2023-05-20T10:00:00.000Z",
        "images": {
          "data": [
            {
              "id": 4,
              "attributes": {
                "url": "/uploads/sunglasses_3456.jpg"
              }
            }
          ]
        },
        "category": {
          "data": {
            "id": 3,
            "attributes": {
              "name": "Accessories"
            }
          }
        }
      }
    }
    // More newest products...
  ],
  "meta": {}
}
```

### Implementation References

- **Controller**: `src/api/product/controllers/product.ts` - `newest` method
- **Service**: `src/api/product/services/product.ts` - `getNewestProducts` method
- **Route**: `src/api/product/routes/product.ts` - `/products/newest` route

## Technical Implementation Details

### Route Order

The routes are defined in a specific order to ensure proper routing:

1. Specific routes (`/products/top-rated`, `/products/newest`) come first
2. Default routes (`/products`, `/products/:id`) come next
3. Parameterized routes with additional segments (`/products/:id/related`) come last

This order prevents conflicts where a parameterized route might capture requests intended for a specific route.

### Error Handling

All endpoints include proper error handling with appropriate HTTP status codes:

- 400: Bad Request (missing or invalid parameters)
- 404: Not Found (product not found)
- 500: Internal Server Error (server-side errors)

### Response Format

All endpoints return responses in Strapi's standard format:

```json
{
  "data": {
    // Response data
  },
  "meta": {
    // Metadata
  }
}
```

### Filtering and Searching

The product listing endpoint supports a wide range of filtering options:

- **Text search**: Search in both product name and description
- **Price range**: Filter by minimum and maximum price
- **Category**: Filter by category ID
- **Stock**: Filter for products that are in stock
- **Rating**: Filter by minimum rating

### Pagination

All listing endpoints support pagination with the following parameters:

- `page`: The page number (default: 1)
- `pageSize`: The number of items per page (default: 10)

### Sorting

The product listing endpoint supports sorting with the `sort` parameter:

- `sort=price:asc`: Sort by price in ascending order
- `sort=price:desc`: Sort by price in descending order
- `sort=createdAt:desc`: Sort by creation date in descending order (newest first)
- `sort=name:asc`: Sort by name in alphabetical order
