# Authentication Endpoints Documentation

This document provides detailed information about all authentication-related endpoints in the EEF Express e-commerce API.

## Table of Contents

1. [Register](#1-register)
2. [Login](#2-login)
3. [Get Current User Profile](#3-get-current-user-profile)
4. [Update Current User Profile](#4-update-current-user-profile)
5. [Address Management](#5-address-management)
   - [Create Address](#51-create-address)
   - [Get All Addresses](#52-get-all-addresses)
   - [Update Address](#53-update-address)
   - [Delete Address](#54-delete-address)

## 1. Register

This endpoint allows you to register a new user account.

### Endpoint

```
POST /api/auth/local/register
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Username for the account (must be unique) |
| email | string | Yes | Email address (must be unique and valid format) |
| password | string | Yes | Password (minimum 6 characters) |

### Example Request

```http
POST /api/auth/local/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Note:** After registration, you can update the user profile with additional information using the "Update Current User Profile" endpoint.

### Response

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "provider": "local",
    "confirmed": true,
    "blocked": false,
    "createdAt": "2023-05-15T10:00:00.000Z",
    "updatedAt": "2023-05-15T10:00:00.000Z"
  }
}
```

## 2. Login

This endpoint allows you to authenticate and receive a JWT token.

### Endpoint

```
POST /api/auth/local
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| identifier | string | Yes | Username or email address |
| password | string | Yes | Password |

### Example Request

```http
POST /api/auth/local
Content-Type: application/json

{
  "identifier": "john.doe@example.com",
  "password": "password123"
}
```

### Response

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "provider": "local",
    "confirmed": true,
    "blocked": false,
    "createdAt": "2023-05-15T10:00:00.000Z",
    "updatedAt": "2023-05-15T10:00:00.000Z"
  }
}
```

## 3. Get Current User Profile

This endpoint allows you to retrieve the profile of the currently authenticated user.

### Endpoint

```
GET /api/users/me
```

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer {jwt} | Yes | JWT token received from login or register |

### Example Request

```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john.doe@example.com",
  "provider": "local",
  "confirmed": true,
  "blocked": false,
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "createdAt": "2023-05-15T10:00:00.000Z",
  "updatedAt": "2023-05-15T10:00:00.000Z",
  "cart": {
    "id": 1,
    "item": []
  },
  "wishlist": {
    "id": 1,
    "products": []
  },
  "orders": [
    {
      "id": 1,
      "status": "Pending",
      "total": 129.99,
      "createdAt": "2023-05-15T10:00:00.000Z"
    }
  ],
  "addresses": [
    {
      "id": 1,
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA",
      "isDefault": true,
      "label": "Home"
    }
  ]
}
```

## 4. Update Current User Profile

This endpoint allows you to update the profile of the currently authenticated user.

### Endpoint

```
PUT /api/users/me
```

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer {jwt} | Yes | JWT token received from login or register |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | No | New username (must be unique) |
| email | string | No | New email address (must be unique and valid format) |
| password | string | No | New password (minimum 6 characters) |
| firstName | string | No | User's first name |
| lastName | string | No | User's last name |
| phoneNumber | string | No | User's phone number |

### Example Request

```http
PUT /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "firstName": "Johnny",
  "lastName": "Doe",
  "phoneNumber": "+9876543210"
}
```

### Response

```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john.doe@example.com",
  "provider": "local",
  "confirmed": true,
  "blocked": false,
  "firstName": "Johnny",
  "lastName": "Doe",
  "phoneNumber": "+9876543210",
  "createdAt": "2023-05-15T10:00:00.000Z",
  "updatedAt": "2023-05-15T11:00:00.000Z"
}
```

## 5. Address Management

### 5.1 Create Address

This endpoint allows you to add a new address to the currently authenticated user's profile.

#### Endpoint

```
POST /api/users/addresses
```

#### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer {jwt} | Yes | JWT token received from login or register |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| address | object | Yes | Address object |
| address.addressLine1 | string | Yes | First line of the address |
| address.addressLine2 | string | No | Second line of the address |
| address.city | string | Yes | City |
| address.state | string | Yes | State or province |
| address.postalCode | string | Yes | Postal or ZIP code |
| address.country | string | Yes | Country |
| address.isDefault | boolean | No | Whether this is the default address (default: false) |
| address.label | string | No | Label for the address (e.g., "Home", "Work") (default: "Home") |
| address.phoneNumber | string | No | Phone number associated with this address |

#### Example Request

```http
POST /api/users/addresses
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "address": {
    "addressLine1": "456 Park Ave",
    "addressLine2": "Apt 789",
    "city": "New York",
    "state": "NY",
    "postalCode": "10022",
    "country": "USA",
    "isDefault": false,
    "label": "Work",
    "phoneNumber": "+1234567890"
  }
}
```

#### Response

The response will be the updated user object including the new address.

### 5.2 Get All Addresses

This endpoint allows you to retrieve all addresses for the currently authenticated user.

#### Endpoint

```
GET /api/users/addresses
```

#### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer {jwt} | Yes | JWT token received from login or register |

#### Example Request

```http
GET /api/users/addresses
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```json
[
  {
    "id": 1,
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "isDefault": true,
    "label": "Home"
  },
  {
    "id": 2,
    "addressLine1": "456 Park Ave",
    "addressLine2": "Apt 789",
    "city": "New York",
    "state": "NY",
    "postalCode": "10022",
    "country": "USA",
    "isDefault": false,
    "label": "Work",
    "phoneNumber": "+1234567890"
  }
]
```

### 5.3 Update Address

This endpoint allows you to update an existing address for the currently authenticated user.

#### Endpoint

```
PUT /api/users/addresses/:id
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | ID of the address to update |

#### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer {jwt} | Yes | JWT token received from login or register |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| address | object | Yes | Address object with fields to update |

#### Example Request

```http
PUT /api/users/addresses/2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "address": {
    "addressLine1": "789 Broadway",
    "city": "New York",
    "isDefault": true
  }
}
```

#### Response

The response will be the updated user object including the modified address.

### 5.4 Delete Address

This endpoint allows you to delete an address for the currently authenticated user.

#### Endpoint

```
DELETE /api/users/addresses/:id
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | ID of the address to delete |

#### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer {jwt} | Yes | JWT token received from login or register |

#### Example Request

```http
DELETE /api/users/addresses/2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

The response will be the updated user object with the address removed.
